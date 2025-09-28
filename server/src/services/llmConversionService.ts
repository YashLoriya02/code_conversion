import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { ComponentInfo } from './fileParserService';
import { ConversionStrategy } from './conversionStrategyService';

dotenv.config();

export interface ConversionResult {
    originalCode: string;
    convertedCode: string;
    changes: string[];
    warnings: string[];
    success: boolean;
    confidence: number;
}

type FileType = 'COMPONENT' | 'PAGE' | 'HOOK' | 'UTIL' | 'ASSET' | 'STYLESHEET' | 'PACKAGE' | 'CONFIG' | 'OTHER';

export class LLMConversionService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    }

    public async generateText(prompt: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        return this.cleanGeminiResponse(result.response.text());
    }

    // Final one for paraller conversion with context
    public async convertCodeWithContext(sourceCode: string, fileType: FileType): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = this.buildFullProjectConversionPrompt(sourceCode, fileType);
        
        const result = await model.generateContent(prompt);
        let response = result.response.text().trim();
        
        return this.cleanGeminiResponse(response);
    }

    // Older one for single component conversion
    async convertComponent(
        componentInfo: ComponentInfo,
        strategy: ConversionStrategy,
        originalCode: string
    ): Promise<ConversionResult> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = this.buildIntelligentConversionPrompt(componentInfo, strategy, originalCode);

            const result = await model.generateContent(prompt);
            let response = result.response.text().trim();

            // Clean the response
            response = this.cleanGeminiResponse(response);

            return this.parseConversionResult(response, originalCode);
        } catch (error) {
            return {
                originalCode,
                convertedCode: originalCode,
                changes: [],
                warnings: [`Gemini conversion failed: ${error}`],
                success: false,
                confidence: 0
            };
        }
    }

    // Code conversion
    async convertReactCodeToReactNative(text: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = this.buildBasicConversionPrompt(text);

        const result = await model.generateContent(prompt);
        let response = result.response.text().trim();

        return this.cleanGeminiResponse(response);
    }
    
    // Helpers
    private buildFullProjectConversionPrompt(code: string, fileType: FileType): string {
        const contextInstruction = `This file was identified as a '${fileType}'. Pay special attention to its role. For example, a 'PAGE' should become a full React Native screen, possibly wrapped in a SafeAreaView. A 'UTIL' file might contain browser-specific APIs that need replacement. An 'ASSET' should be imported using an \`Image\` component.`;

        return `
You are an expert React Native developer. Convert the provided React code to React Native code.

## CONTEXT:
${contextInstruction}

## COMPREHENSIVE CONVERSION RULES:
[Your detailed rules from buildIntelligentConversionPrompt go here - e.g., Element Conversions, Style Conversions, etc.]

## OUTPUT REQUIREMENTS:
- Return ONLY the converted code.
- No markdown formatting, backticks, or explanatory text.
- Ensure all necessary React and React Native imports are included.

## COMPREHENSIVE CONVERSION RULES:

### Element Conversions:
- <div> → <View>
- <span> → <Text>
- <h1>, <h2>, <h3>, <h4>, <h5>, <h6> → <Text> with appropriate fontSize
- <p> → <Text>
- <button> → <TouchableOpacity> with <Text> child
- <input> → <TextInput>
- <img> → <Image>
- <a> → <TouchableOpacity> with <Text> child + Linking for external URLs
- <ul>, <ol> → <FlatList> or <View> with custom list implementation
- <li> → <View> with <Text>
- <form> → <View>
- <label> → <Text>

### Style Conversions:
- Convert all CSS classes to StyleSheet objects
- Transform CSS properties to React Native equivalents:
  - margin-top → marginTop
  - background-color → backgroundColor
  - font-size → fontSize
  - font-weight → fontWeight
  - text-align → textAlign
  - border-radius → borderRadius
  - flex-direction → flexDirection
  - align-items → alignItems
  - justify-content → justifyContent
- Remove unsupported properties (box-shadow, etc.)
- Convert px units to numbers
- Use flexbox for layouts

### Import Statements:
- Always import React from 'react'
- Import required React Native components: View, Text, TouchableOpacity, TextInput, Image, StyleSheet, ScrollView, SafeAreaView, FlatList, etc.
- Add Platform import if platform-specific code is needed
- Import Linking for external URLs

### Event Handling:
- onClick → onPress
- onChange → onChangeText (for TextInput)
- onSubmit → handle with onPress
- Remove browser-specific events

### Unsupported Features Replacement:
- Replace localStorage with AsyncStorage (import from '@react-native-async-storage/async-storage')
- Replace window/document APIs with appropriate React Native equivalents
- Convert CSS animations to Animated API or react-native-reanimated
- Replace fetch with React Native fetch (built-in)

## OUTPUT FORMAT:
Provide your response in this EXACT format:

CONVERTED_CODE:
[converted code here - no backticks, no markdown]

CHANGES_MADE:
- [specific change 1]
- [specific change 2]
- [etc...]

WARNINGS:
- [any potential issues or manual review needed]

CONFIDENCE_SCORE: [0-100]

## ORIGINAL CODE TO CONVERT:
${code}`;
    }

    private buildIntelligentConversionPrompt(
        componentInfo: ComponentInfo,
        strategy: ConversionStrategy,
        code: string
    ): string {
        return `
You are an expert React Native developer. Convert the provided React code to React Native code using the component analysis provided.

## COMPONENT ANALYSIS:
- Component Name: ${componentInfo.name}
- Component Type: ${componentInfo.type}
- Hooks Used: ${componentInfo.hooks.join(', ') || 'None'}
- State Usage: ${componentInfo.stateUsage ? 'Yes' : 'No'}
- Props Usage: ${componentInfo.propsUsage ? 'Yes' : 'No'}
- JSX Elements Found: ${componentInfo.jsxElements.join(', ')}

## CONVERSION STRATEGY:
- Complexity Level: ${strategy.complexity}
- Priority: ${strategy.priority}
- Estimated Effort: ${strategy.estimatedEffort} hours

## REQUIRED CHANGES:
${strategy.requiredChanges.map(change => `- ${change}`).join('\n')}

## INCOMPATIBLE FEATURES DETECTED:
${strategy.incompatibleFeatures.length > 0 ?
                strategy.incompatibleFeatures.map(feature => `- ${feature}`).join('\n') :
                '- None detected'
            }

## SUGGESTED ALTERNATIVES:
${Object.entries(strategy.suggestedAlternatives).length > 0 ?
                Object.entries(strategy.suggestedAlternatives).map(([old, newItem]) => `- Replace ${old} with ${newItem}`).join('\n') :
                '- Standard React Native conversions apply'
            }

## COMPREHENSIVE CONVERSION RULES:

### Element Conversions:
- <div> → <View>
- <span> → <Text>
- <h1>, <h2>, <h3>, <h4>, <h5>, <h6> → <Text> with appropriate fontSize
- <p> → <Text>
- <button> → <TouchableOpacity> with <Text> child
- <input> → <TextInput>
- <img> → <Image>
- <a> → <TouchableOpacity> with <Text> child + Linking for external URLs
- <ul>, <ol> → <FlatList> or <View> with custom list implementation
- <li> → <View> with <Text>
- <form> → <View>
- <label> → <Text>

### Style Conversions:
- Convert all CSS classes to StyleSheet objects
- Transform CSS properties to React Native equivalents:
  - margin-top → marginTop
  - background-color → backgroundColor
  - font-size → fontSize
  - font-weight → fontWeight
  - text-align → textAlign
  - border-radius → borderRadius
  - flex-direction → flexDirection
  - align-items → alignItems
  - justify-content → justifyContent
- Remove unsupported properties (box-shadow, etc.)
- Convert px units to numbers
- Use flexbox for layouts

### Import Statements:
- Always import React from 'react'
- Import required React Native components: View, Text, TouchableOpacity, TextInput, Image, StyleSheet, ScrollView, SafeAreaView, FlatList, etc.
- Add Platform import if platform-specific code is needed
- Import Linking for external URLs

### Event Handling:
- onClick → onPress
- onChange → onChangeText (for TextInput)
- onSubmit → handle with onPress
- Remove browser-specific events

### Special Considerations Based on Analysis:
${componentInfo.hooks.includes('useState') ? '- Maintain useState hooks (compatible with React Native)' : ''}
${componentInfo.hooks.includes('useEffect') ? '- Maintain useEffect hooks (compatible with React Native)' : ''}
${componentInfo.hooks.includes('useContext') ? '- Maintain useContext hooks (compatible with React Native)' : ''}
${componentInfo.type === 'class' ? '- Convert class component lifecycle methods appropriately' : ''}

### Unsupported Features Replacement:
- Replace localStorage with AsyncStorage (import from '@react-native-async-storage/async-storage')
- Replace window/document APIs with appropriate React Native equivalents
- Convert CSS animations to Animated API or react-native-reanimated
- Replace fetch with React Native fetch (built-in)

## OUTPUT FORMAT:
Provide your response in this EXACT format:

CONVERTED_CODE:
[converted code here - no backticks, no markdown]

CHANGES_MADE:
- [specific change 1]
- [specific change 2]
- [etc...]

WARNINGS:
- [any potential issues or manual review needed]

CONFIDENCE_SCORE: [0-100]

## ORIGINAL CODE TO CONVERT:
${code}

Remember: Return clean code without any markdown formatting, backticks, or language identifiers.`;
    }

    private buildBasicConversionPrompt(text: string): string {
        return `
You are an expert React Native developer. Convert the provided React code to React Native code following these comprehensive rules:

## Element Conversions:
- <div> → <View>
- <span> → <Text>
- <h1>, <h2>, <h3>, <h4>, <h5>, <h6> → <Text> with appropriate fontSize
- <p> → <Text>
- <button> → <TouchableOpacity> with <Text> child
- <input> → <TextInput>
- <img> → <Image>
- <a> → <TouchableOpacity> with <Text> child
- <ul>, <ol> → <View> with custom list implementation
- <li> → <View> with <Text>
- <form> → <View>
- <label> → <Text>

## Style Conversions:
- Convert all CSS classes to StyleSheet objects
- Transform CSS properties to React Native equivalents:
  - margin-top → marginTop
  - background-color → backgroundColor
  - font-size → fontSize
  - font-weight → fontWeight
  - text-align → textAlign
  - border-radius → borderRadius
  - flex-direction → flexDirection
  - align-items → alignItems
  - justify-content → justifyContent
- Remove unsupported properties (box-shadow, etc.)
- Convert px units to numbers
- Use flexbox for layouts

## Import Statements:
- Always import React from 'react'
- Import required React Native components: View, Text, TouchableOpacity, TextInput, Image, StyleSheet, ScrollView, SafeAreaView, etc.
- Add Platform import if platform-specific code is needed

## Event Handling:
- onClick → onPress
- onChange → onChangeText (for TextInput)
- onSubmit → handle with onPress
- Remove browser-specific events

## Unsupported Features:
- Replace localStorage with AsyncStorage (import from '@react-native-async-storage/async-storage')
- Replace window/document APIs with appropriate React Native equivalents
- Remove or replace CSS animations with Animated API
- Convert complex CSS layouts to Flexbox

## Best Practices:
- Use StyleSheet.create() for styles
- Implement proper TypeScript types if present
- Use SafeAreaView for main containers
- Add proper key props for lists
- Use ScrollView for scrollable content
- Maintain component structure and logic

## Output Requirements:
- Return ONLY the converted code
- No markdown formatting
- No backticks or language identifiers
- No explanatory text
- Clean, properly formatted code
- Include all necessary imports
- Use proper indentation

Convert this React code:
${text}`;
    }

    private cleanGeminiResponse(response: string): string {
        response = response
            .replace(/^```[\w]*\n?/gm, '')
            .replace(/`/g, '')
            .trim();

        // Remove language identifiers
        if (response.startsWith('javascript\n') || response.startsWith('typescript\n') || response.startsWith('tsx\n')) {
            response = response.split('\n').slice(1).join('\n');
        }

        return response;
    }

    private parseConversionResult(response: string, originalCode: string): ConversionResult {
        // Parse the structured response
        const codeMatch = response.match(/CONVERTED_CODE:\s*([\s\S]*?)(?=CHANGES_MADE:|WARNINGS:|CONFIDENCE_SCORE:|$)/);
        const changesMatch = response.match(/CHANGES_MADE:\s*([\s\S]*?)(?=WARNINGS:|CONFIDENCE_SCORE:|$)/);
        const warningsMatch = response.match(/WARNINGS:\s*([\s\S]*?)(?=CONFIDENCE_SCORE:|$)/);
        const confidenceMatch = response.match(/CONFIDENCE_SCORE:\s*(\d+)/);

        const convertedCode = codeMatch ? codeMatch[1].trim() : response;
        const changes = changesMatch ?
            changesMatch[1].trim().split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) :
            ['Code converted to React Native'];
        const warnings = warningsMatch ?
            warningsMatch[1].trim().split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) :
            [];
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 85;

        return {
            originalCode,
            convertedCode: this.cleanGeminiResponse(convertedCode),
            changes,
            warnings,
            success: convertedCode.length > 0,
            confidence
        };
    }
}
