export interface ImportInfo {
    source: string;
    specifiers: string[];
    isDefault: boolean;
    isNamespace: boolean;
}

export interface ExportInfo {
    name: string;
    isDefault: boolean;
    type: 'component' | 'function' | 'variable' | 'unknown';
}

export interface ComponentInfo {
    name: string;
    filePath: string;
    type: 'functional' | 'class' | 'unknown';
    hooks: string[];
    imports: ImportInfo[];
    exports: ExportInfo[];
    jsxElements: string[];
    stateUsage: boolean;
    propsUsage: boolean;
    dependencies: string[];
}

export interface ParseError {
    file: string;
    error: string;
    line?: number;
    column?: number;
}

export interface ParsedProject {
    components: ComponentInfo[];
    dependencies: string[];
    packageJson: any;
    totalFiles: number;
    parsedFiles: number;
    errors: ParseError[];
}

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
