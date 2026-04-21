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
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const result = await model.generateContent(prompt);
        return this.cleanGeminiResponse(result.response.text());
    }

    // Final one for paraller conversion with context
    public async convertCodeWithContext(sourceCode: string, fileType: FileType): Promise<ConversionResult> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const prompt = this.buildFullProjectConversionPrompt(sourceCode, fileType);

        const result = await model.generateContent(prompt);
        let response = result.response.text().trim();

        // return this.cleanGeminiResponse(response);
        response = this.cleanGeminiResponse(response);

        // Reuse your existing parser
        return this.parseConversionResult(response, sourceCode);

    }

    // Older one for single component conversion
    async convertComponent(
        componentInfo: ComponentInfo,
        strategy: ConversionStrategy,
        originalCode: string
    ): Promise<ConversionResult> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

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
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = this.buildBasicConversionPrompt(text);

        const result = await model.generateContent(prompt);
        let response = result.response.text().trim();

        return this.cleanGeminiResponse(response);
    }

    // Helpers
    private buildFullProjectConversionPrompt(code: string, fileType: FileType): string {
        const contextInstruction = `This file was identified as a '${fileType}'. Pay special attention to its role. For example, a 'PAGE' should become a full React Native screen, possibly wrapped in a SafeAreaView and integrated with navigation. A 'COMPONENT' should remain a reusable UI piece. A 'HOOK' or 'UTIL' file might contain browser-specific APIs that need replacement. An 'ASSET' should be imported using an Image component or appropriate React Native asset handling.`;

        return `
You are an expert React Native developer. Convert the provided React (web) code to idiomatic, production-ready React Native code.

## CONTEXT
${contextInstruction}

The goal is to produce code that **actually runs in React Native** (no DOM, no browser-only APIs, no web-only libraries). Prefer clean, minimal, maintainable patterns.

---

## HIGH-LEVEL BEHAVIOUR

- Preserve core **logic and structure** (state, hooks, props, business logic).
- Replace **web-only concepts** with correct React Native equivalents.
- Make sure the output is **syntactically valid** and imports all required symbols.
- If something cannot be converted safely, **remove it from code** and report it in WARNINGS.

---

## ELEMENT CONVERSIONS

Translate JSX elements as follows:

- <div> → <View>
- <span> → <Text>
- <h1>–<h6> → <Text> with appropriate style (e.g. fontSize, fontWeight)
- <p> → <Text>
- <button> → <TouchableOpacity> wrapping a <Text> label
- <input> → <TextInput>
- <textarea> → <TextInput multiline />
- <img> → <Image>
- <a> (for links) → <TouchableOpacity> with <Text> child + Linking.openURL for external URLs
- <ul>, <ol> → <View> or <FlatList> with custom list items
- <li> → <View> + <Text>
- <form> → <View> + manual handlers (no native form events)
- <label> → <Text>

For layout:
- Prefer <View> + flexbox over semantic tags.
- Use <ScrollView> when web code expects scrolling containers.

---

## STYLE CONVERSIONS

- Convert all CSS classes and inline styles into **StyleSheet.create** objects.
- CSS → JS style props:
  - margin-top → marginTop
  - background-color → backgroundColor
  - font-size → fontSize
  - font-weight → fontWeight
  - text-align → textAlign
  - border-radius → borderRadius
  - flex-direction → flexDirection
  - align-items → alignItems
  - justify-content → justifyContent
- Remove or simplify unsupported properties:
  - box-shadow, filter, complex gradients, etc.
  - If critical visually, approximate with elevation, border, backgroundColor, etc.
- Convert pixel values (e.g. "16px") to numeric values (e.g. 16).
- Remove direct imports of CSS/SCSS files (e.g. \`import "./index.css"\`) and migrate styles into JS.

---

## IMPORT & MODULE HANDLING

- Always import React from 'react' when needed.
- Import required React Native components:
  - From 'react-native': View, Text, SafeAreaView, ScrollView, Image, TouchableOpacity, TextInput, FlatList, StyleSheet, Platform, Linking, etc. **only what is used**.
- Do NOT import any DOM libraries like 'react-dom'.
- Remove any references to \`document\`, \`window\`, \`navigator\`, \`HTMLElement\`, etc. Replace them with React Native equivalents or remove + warn.
- If fileType is:
  - 'PAGE': export a screen-like component (e.g. \`export default function ScreenName(){...}\`) wrapped in SafeAreaView or ScrollView if needed.
  - 'HOOK' / 'UTIL': keep the same exported hook / helper names, but remove browser-specific APIs.
  - 'ASSET': this file usually should NOT be JS – warn if the code implies web-only asset handling.

---

## EVENT & INTERACTION CONVERSION

- onClick → onPress (TouchableOpacity, Pressable, etc.)
- onChange for inputs:
  - TextInput: onChangeText={(value) => ...}
- form events (onSubmit, onSubmitCapture) → manual handler (e.g. onPress on a button) that triggers the submit logic.
- Prevent usage of any DOM event types or event properties that do not exist in React Native.

---

## UNSUPPORTED LIBRARIES & PATTERNS (CRITICAL)

### Browser / DOM / Web-only libraries

- Remove imports from:
  - 'react-dom'
  - 'react-router-dom' (use React Navigation patterns instead; if not obvious, remove router usage and add WARNINGS)
  - 'react-hot-toast'
  - Any library that clearly depends on the DOM or window/document.
- For these:
  - Either replace with a React Native alternative, OR
  - Remove from code and mention in WARNINGS exactly what was removed and why.

### Recommended replacements

- \`react-hot-toast\`:
  - Remove this import and its usage entirely, OR
  - Replace with \`react-native-toast-message\`:
    - \`import Toast from "react-native-toast-message";\`
    - Place <Toast /> at the root and use Toast.show(...) instead of toast().
- \`react-router-dom\`:
  - If navigation structure is simple, prefer React Navigation
    (\`@react-navigation/native\`, \`@react-navigation/native-stack\`), but if that is too complex to infer reliably, remove the router usage and add a clear WARNING.
- Any window/document usage:
  - Replace common patterns like window.innerWidth or scrollTo with Platform APIs, Dimensions, or remove and warn.

Never leave browser-only APIs or web-only imports in the final React Native code.

---

## STATE, HOOKS & LOGIC

- Preserve hooks: useState, useEffect, useContext, useMemo, useCallback, useRef, etc. – they work in React Native.
- Preserve business logic and data flow.
- For custom hooks from other files, keep the imports as-is (relative paths) but assume those files are also converted.

---

## NETWORKING & STORAGE

- \`fetch\` is available in React Native; keep it, but remove any browser-specific fetch options that are not supported.
- Replace:
  - localStorage/sessionStorage → AsyncStorage (from '@react-native-async-storage/async-storage') or other RN storage.
- Add clear WARNINGS when storage logic was significantly changed.

---

## FILE-TYPE SPECIFIC BEHAVIOUR

- 'PAGE':
  - Treat as a screen component.
  - Prefer default export of a function component.
  - Wrap content in SafeAreaView and/or ScrollView when content scrolls.
- 'COMPONENT':
  - Keep reusable, presentational logic.
- 'HOOK':
  - Keep hook signature; ensure no DOM usage.
- 'UTIL':
  - Keep functions but remove/replace any browser globals.
- 'STYLESHEET':
  - Convert CSS modules or plain CSS into StyleSheet objects referenced by components.
- 'CONFIG' / 'OTHER':
  - Preserve config shape but remove node/web-specific APIs that don’t exist on React Native.

---

## OUTPUT FORMAT (STRICT)

Return your response **in this exact structure**:

CONVERTED_CODE:
[converted code here - ONLY valid React Native/JS/TS code, no backticks, no markdown]

CHANGES_MADE:
- [specific change 1, e.g. "Replaced <div> with <View> and added flex styles"]
- [specific change 2, e.g. "Removed react-hot-toast and added Toast from react-native-toast-message"]
- [etc...]

WARNINGS:
- [any potential issues or manual review needed, e.g. "Removed window.scrollTo because it's not supported in React Native"]
- [etc...]

CONFIDENCE_SCORE: [0-100]

Rules:
- In the CONVERTED_CODE section, include **only** the final code (no comments describing your reasoning).
- CHANGES_MADE and WARNINGS must be bullet lists with "-" at the start of each item.
- CONFIDENCE_SCORE is a single integer from 0 to 100.

---

## ORIGINAL CODE TO CONVERT
${code}
`;
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
