import { ComponentInfo, ParsedProject } from './fileParserService';

export interface ConversionStrategy {
    componentName: string;
    priority: 'high' | 'medium' | 'low';
    complexity: 'simple' | 'moderate' | 'complex';
    requiredChanges: string[];
    incompatibleFeatures: string[];
    suggestedAlternatives: { [key: string]: string };
    estimatedEffort: number;
}

export interface ProjectAnalysis {
    totalComponents: number;
    convertibleComponents: number;
    complexComponents: string[];
    incompatibleDependencies: string[];
    conversionStrategies: ConversionStrategy[];
    overallComplexity: 'simple' | 'moderate' | 'complex';
    estimatedConversionTime: number;
    recommendations: string[];
}

export class ConversionStrategyService {
    private incompatibleWebAPIs = [
        'localStorage', 'sessionStorage', 'document', 'window', 'location',
        'navigator', 'history', 'XMLHttpRequest', 'fetch'
    ];

    private incompatibleLibraries = [
        'react-router-dom', 'react-router', 'react-helmet', 'react-hot-loader',
        'styled-components', 'emotion', 'material-ui', 'antd', 'bootstrap'
    ];

    private reactNativeAlternatives = {
        'react-router-dom': '@react-navigation/native',
        'react-router': '@react-navigation/native',
        'styled-components': 'react-native StyleSheet',
        'localStorage': '@react-native-async-storage/async-storage',
        'sessionStorage': '@react-native-async-storage/async-storage',
        'fetch': 'react-native fetch (built-in)',
        'div': 'View',
        'span': 'Text',
        'p': 'Text',
        'h1': 'Text',
        'h2': 'Text',
        'h3': 'Text',
        'button': 'TouchableOpacity',
        'input': 'TextInput',
        'img': 'Image',
        'a': 'TouchableOpacity + Linking'
    };

    analyzeProject(parsedProject: ParsedProject): ProjectAnalysis {
        const analysis: ProjectAnalysis = {
            totalComponents: parsedProject.components.length,
            convertibleComponents: 0,
            complexComponents: [],
            incompatibleDependencies: [],
            conversionStrategies: [],
            overallComplexity: 'simple',
            estimatedConversionTime: 0,
            recommendations: []
        };

        analysis.incompatibleDependencies = parsedProject.dependencies.filter(dep =>
            this.incompatibleLibraries.some(incompatible => dep.includes(incompatible))
        );

        for (const component of parsedProject.components) {
            const strategy = this.analyzeComponent(component);
            analysis.conversionStrategies.push(strategy);

            if (strategy.complexity !== 'complex') {
                analysis.convertibleComponents++;
            } else {
                analysis.complexComponents.push(component.name);
            }

            analysis.estimatedConversionTime += strategy.estimatedEffort;
        }

        const complexRatio = analysis.complexComponents.length / analysis.totalComponents;
        if (complexRatio > 0.5) {
            analysis.overallComplexity = 'complex';
        } else if (complexRatio > 0.2) {
            analysis.overallComplexity = 'moderate';
        }

        analysis.recommendations = this.generateRecommendations(analysis, parsedProject);
        return analysis;
    }

    private analyzeComponent(component: ComponentInfo): ConversionStrategy {
        const strategy: ConversionStrategy = {
            componentName: component.name,
            priority: 'medium',
            complexity: 'simple',
            requiredChanges: [],
            incompatibleFeatures: [],
            suggestedAlternatives: {},
            estimatedEffort: 1
        };

        for (const element of component.jsxElements) {
            if (this.isHTMLElement(element)) {
                strategy.requiredChanges.push(`Convert ${element} to React Native equivalent`);
                if (this.reactNativeAlternatives[element]) {
                    strategy.suggestedAlternatives[element] = this.reactNativeAlternatives[element];
                }
            }
        }

        if (component.hooks.length > 3) {
            strategy.complexity = 'moderate';
            strategy.estimatedEffort += 1;
        }

        for (const importInfo of component.imports) {
            if (this.incompatibleLibraries.some(lib => importInfo.source.includes(lib))) {
                strategy.incompatibleFeatures.push(importInfo.source);
                strategy.complexity = 'complex';
                strategy.estimatedEffort += 2;
            }
        }

        if (strategy.complexity === 'simple') {
            strategy.priority = 'high';
        } else if (strategy.complexity === 'complex') {
            strategy.priority = 'low';
        }

        return strategy;
    }

    private isHTMLElement(elementName: string): boolean {
        const htmlElements = [
            'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'button', 'input', 'textarea', 'select', 'option',
            'img', 'a', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th',
            'form', 'label', 'br', 'hr'
        ];
        return htmlElements.includes(elementName.toLowerCase());
    }

    private generateRecommendations(analysis: ProjectAnalysis, parsedProject: ParsedProject): string[] {
        const recommendations: string[] = [];

        if (analysis.incompatibleDependencies.length > 0) {
            recommendations.push(
                `Replace ${analysis.incompatibleDependencies.length} incompatible dependencies with React Native alternatives`
            );
        }

        if (analysis.complexComponents.length > 0) {
            recommendations.push(
                `${analysis.complexComponents.length} components require manual attention due to complexity`
            );
        }

        if (analysis.overallComplexity === 'complex') {
            recommendations.push('Consider phased migration approach due to project complexity');
        }

        const webAPIUsage = parsedProject.components.some(c =>
            c.imports.some(i => this.incompatibleWebAPIs.some(api => i.source.includes(api)))
        );

        if (webAPIUsage) {
            recommendations.push('Replace web APIs (localStorage, document, window) with React Native equivalents');
        }

        return recommendations;
    }
}
