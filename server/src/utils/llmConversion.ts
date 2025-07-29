import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export const convertReactCodeToReactNative = async (text: string): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
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

    const result = await model.generateContent(prompt);
    let response = result.response.text().trim();

    response = response
        .replace(/^```[\w]*\n?/gm, '')
        .replace(/```$/gm, '')
        .replace(/`/g, '')
        .trim();

    if (response.startsWith('javascript\n') || response.startsWith('typescript\n') || response.startsWith('tsx\n')) {
        response = response.split('\n').slice(1).join('\n');
    }

    return response;
};