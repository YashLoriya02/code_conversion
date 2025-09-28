import path from 'path';
import { LLMConversionService } from './llmConversionService';

interface ManifestItem {
    newPath: string | null;
    filePath: string;
}

export class AssemblyService {
    private llmService: LLMConversionService;

    constructor() {
        this.llmService = new LLMConversionService();
    }

    public async transformPackageJson(originalPackageJsonStr: string, useLLM: boolean = false): Promise<string> {
        if (useLLM) {
            try {
                return await this.transformPackageJsonWithLLM(originalPackageJsonStr);
            } catch (error) {
                return this.transformPackageJsonWithRules(originalPackageJsonStr);
            }
        } else {
            return this.transformPackageJsonWithRules(originalPackageJsonStr);
        }
    }

    private async transformPackageJsonWithLLM(originalPackageJsonStr: string): Promise<string> {
        const prompt = `
You are an expert React Native developer. Your task is to convert the following React (web) 'package.json' file into a valid, runnable 'package.json' for a new React Native project.

Follow these rules precisely:
1.  **Remove Web-Only Dependencies**: Completely remove packages like 'react-dom', 'react-scripts', and 'web-vitals'.
2.  **Map Core Libraries**: Replace 'react-router-dom' with '@react-navigation/native'.
3.  **Ensure Base Dependencies**: Make sure the final JSON includes 'react-native', '@react-navigation/stack', 'react-native-safe-area-context', and 'react-native-screens'.
4.  **Preserve Compatible Libraries**: Keep other compatible libraries like 'axios', 'moment', or 'lodash', preserving their original versions.
5.  **Update Scripts**: Replace the 'scripts' section with standard React Native commands ('start', 'android', 'ios').
6.  **Maintain Metadata**: Keep original fields like 'name', 'version', 'author', 'license', etc.
7.  **Output Format**: Your response must be ONLY the raw, valid JSON content of the new package.json file. Do not include any explanatory text, markdown, or backticks.

Original package.json:
${originalPackageJsonStr}
`;

        const convertedJsonString = await this.llmService.generateText(prompt);

        JSON.parse(convertedJsonString);

        return JSON.stringify(JSON.parse(convertedJsonString), null, 2);
    }

    public createIndexJs(): string {
        return `import { AppRegistry } from 'react-native';
import App from './App';
// You will need to create a basic app.json file in the final zip
import { name as appName } from './app.json'; 

AppRegistry.registerComponent(appName, () => App);`;
    }

    public transformPackageJsonWithRules(originalPackageJsonStr: string): string {
        const originalPackage = JSON.parse(originalPackageJsonStr);

        const dependencyMap = {
            "react": "react-native",
            "react-dom": "react-native",

            "react-router-dom": "@react-navigation/native",
            "react-router": "@react-navigation/native",

            "lucide-react": "lucide-react-native",
            "react-icons": "react-native-vector-icons",
            "@mui/material": "react-native-paper",
            "antd": "@ant-design/react-native",

            "styled-components": "styled-components/native",
            "classnames": "clsx",

            "redux": "redux",
            "@reduxjs/toolkit": "@reduxjs/toolkit",
            "react-redux": "react-redux",

            "axios": "axios",
            "swr": "react-query",

            "react-toastify": "react-native-toast-message",
            "framer-motion": "react-native-reanimated",
            "react-hot-toast": "react-native-toast-message",
            "react-modal": "react-native-modal",
            "react-responsive": "react-native-responsive-screen",
            "react-player": "react-native-video",

            // File Handling
            "react-dropzone": "react-native-document-picker",
            "file-saver": "expo-file-system",

            "chart.js": "react-native-chart-kit",
            "recharts": "victory-native",

            "@testing-library/react": "@testing-library/react-native",
            "@testing-library/jest-dom": "@testing-library/jest-native",

            "uuid": "react-native-uuid",
            "dotenv": "react-native-dotenv",
        };

        const newDependencies = {
            'react': originalPackage?.dependencies?.react || '18.2.0',
            'react-native': '0.73.6',

            '@react-navigation/native': '^6.1.17',
            '@react-navigation/stack': '^6.3.29',
            '@react-navigation/bottom-tabs': '^6.6.5',
            'react-native-screens': '~3.29.0',
            'react-native-safe-area-context': '4.8.2',
            'react-native-gesture-handler': '^2.14.0',
            'react-native-reanimated': '^3.10.1',

            'react-native-paper': '^5.12.3',
            'react-native-vector-icons': '^10.0.3',
            'styled-components': '^6.1.8',

            'react-redux': originalPackage?.dependencies['react-redux'] || '^9.1.2',
            '@reduxjs/toolkit': originalPackage?.dependencies['@reduxjs/toolkit'] || '^2.2.1',

            'axios': originalPackage?.dependencies.axios || '^1.6.8',

            'formik': originalPackage?.dependencies.formik || '^2.4.5',
            'yup': originalPackage?.dependencies.yup || '^1.3.3',

            'react-native-toast-message': '^2.2.0',
            'react-native-modal': '^13.0.1',
            'react-native-responsive-screen': '^1.4.2',
            'react-native-uuid': '^2.0.1',
            'react-native-dotenv': '^3.4.10',

            'react-native-video': '^6.0.0-alpha.2',

            'react-native-document-picker': '^9.1.1',
            'react-native-fs': '^2.20.0',

            'react-native-chart-kit': '^6.12.0',
            'victory-native': '^36.9.2',

            '@testing-library/react-native': '^12.5.0',
            '@testing-library/jest-native': '^5.4.2'
        };

        for (const dep in originalPackage?.dependencies) {
            if (dependencyMap[dep]) {
                newDependencies[dependencyMap[dep]] = 'latest';
            } else if (!['react-dom', 'react-scripts'].includes(dep)) {
                newDependencies[dep] = originalPackage?.dependencies[dep];
            }
        }

        const newPackage = {
            name: originalPackage?.name || 'converted-app',
            version: '0.0.1',
            private: true,
            main: 'index.js',
            scripts: {
                start: 'react-native start',
                android: 'react-native run-android',
                ios: 'react-native run-ios',
            },
            dependencies: newDependencies,
            devDependencies: {
                "@babel/core": "^7.20.0",
                "metro-react-native-babel-preset": "0.77.0",
            },
        };

        return JSON.stringify(newPackage, null, 2);
    }

    public createRootNavigator(pages: ManifestItem[]): string {
        // --- FIX: Handle the case where no pages are converted ---
        if (!pages || pages.length === 0) {
            return `import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

const App = () => (
  <SafeAreaView style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
    <Text>No pages were converted to create a navigator.</Text>
  </SafeAreaView>
);

export default App;`;
        }

        const componentImports = pages
            .map(page => {
                const componentName = this.getComponentNameFromPath(page.newPath!);
                const importPath = `./${page.newPath}`;
                return `import ${componentName} from '${importPath}';`;
            })
            .join('\n');

        const screens = pages
            .map(page => {
                const componentName = this.getComponentNameFromPath(page.newPath!);
                return `        <Stack.Screen name="${componentName}" component={${componentName}} />`;
            })
            .join('\n');

        const initialRouteName = this.getComponentNameFromPath(pages[0].newPath!);

        return `import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

${componentImports}

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="${initialRouteName}">
${screens}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;`;
    }

    private getComponentNameFromPath(filePath: string): string {
        if (!filePath) return 'UnnamedComponent';
        const baseName = path.basename(filePath, path.extname(filePath));
        return baseName
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }
}
