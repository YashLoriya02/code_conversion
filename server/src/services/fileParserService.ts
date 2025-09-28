import * as babel from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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

export interface ParsedProject {
    components: ComponentInfo[];
    dependencies: string[];
    packageJson: any;
    totalFiles: number;
    parsedFiles: number;
    errors: ParseError[];
}

export interface ParseError {
    file: string;
    error: string;
    line?: number;
    column?: number;
}

interface GitHubFile {
    name: string;
    path: string;
    sha: string;
    download_url: string | null;
    type: 'file' | 'dir';
}

export class FileParserService {
    private supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
    private reactHooks = [
        'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
        'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue'
    ];

    async parseProject(input?: GitHubFile[]): Promise<ParsedProject> {
        const result: ParsedProject = {
            components: [],
            dependencies: [],
            packageJson: null,
            totalFiles: 0,
            parsedFiles: 0,
            errors: []
        };

        let packageJsonContent: string | null = null;
        let filesToParse: { path: string; getContent: () => Promise<string> }[] = [];

        const allFiles = input;
        const packageJsonFile = (allFiles ?? []).find(file => file.path === 'package.json');

        if (packageJsonFile?.download_url) {
            try {
                const response = await axios.get(packageJsonFile.download_url);
                if (response.status == 200) {
                    throw new Error(`Failed to fetch package.json: ${response.statusText}`);
                }

                packageJsonContent = await response.data.text();
            } catch (error: any) {
                result.errors.push({ file: 'package.json', error: error.message });
            }
        }

        const reactFiles = (allFiles ?? []).filter(file =>
            file.type === 'file' &&
            this.supportedExtensions.some(ext => file.path.endsWith(ext)) &&
            file.download_url
        );

        filesToParse = reactFiles.map(file => ({
            path: file.path,
            getContent: async () => {
                const response = await fetch(file.download_url!);
                if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                return await response.text();
            }
        }));

        if (packageJsonContent) {
            try {
                result.packageJson = JSON.parse(packageJsonContent);
                result.dependencies = Object.keys({
                    ...(result.packageJson.dependencies || {}),
                    ...(result.packageJson.devDependencies || {}),
                });
            } catch (error: any) {
                result.errors.push({ file: 'package.json', error: 'Failed to parse JSON.' });
            }
        }

        result.totalFiles = filesToParse.length;

        for (const file of filesToParse) {
            try {
                const componentInfo = await this.parseReactFile(file.path);
                if (componentInfo) {
                    result.components.push(componentInfo);
                    result.parsedFiles++;
                }
            } catch (error: any) {
                result.errors.push({
                    file: file.path,
                    error: error instanceof Error ? error.message : 'Unknown parsing error'
                });
            }
        }

        return result;
    }

    // private async findReactFiles(dirPath: string): Promise<string[]> {
    //     const files: string[] = [];
    //     const excludedDirs = ['node_modules', '.git', 'build', 'dist', '.next'];

    //     const traverse = (currentPath: string) => {
    //         try {
    //             const items = fs.readdirSync(currentPath, { withFileTypes: true });

    //             for (const item of items) {
    //                 const fullPath = path.join(currentPath, item.name);
    //                 if (item.isDirectory()) {
    //                     if (!excludedDirs.includes(item.name)) {
    //                         traverse(fullPath);
    //                     }
    //                 } else if (item.isFile()) {
    //                     const ext = path.extname(item.name);
    //                     if (this.supportedExtensions.includes(ext)) {
    //                         files.push(fullPath);
    //                     }
    //                 }
    //             }
    //         } catch (error) {
    //             console.error(`Could not read directory: ${currentPath}`, error);
    //         }
    //     };

    //     traverse(dirPath);
    //     return files;
    // }

    private async parseReactFile(filePath: string): Promise<ComponentInfo | null> {
        const code = fs.readFileSync(filePath, 'utf-8');

        // Skip if file doesn't contain React-related content
        if (!this.isReactFile(code)) {
            return null;
        }

        const ast = babel.parse(code, {
            sourceType: 'module',
            plugins: [
                'jsx',
                'typescript',
                'decorators-legacy',
                'classProperties',
                'objectRestSpread',
                'asyncGenerators',
                'exportDefaultFrom',
                'dynamicImport'
            ]
        });

        const componentInfo: ComponentInfo = {
            name: path.basename(filePath, path.extname(filePath)),
            filePath,
            type: 'unknown',
            hooks: [],
            imports: [],
            exports: [],
            jsxElements: [],
            stateUsage: false,
            propsUsage: false,
            dependencies: []
        };

        // Traverse AST to extract information
        traverse(ast, {
            ImportDeclaration: (path) => {
                const importInfo = this.parseImport(path.node);
                componentInfo.imports.push(importInfo);

                if (importInfo.source.startsWith('.')) {
                    componentInfo.dependencies.push(importInfo.source);
                }
            },

            ExportDefaultDeclaration: (path) => {
                const exportInfo = this.parseExport(path.node, true);
                componentInfo.exports.push(exportInfo);
            },

            ExportNamedDeclaration: (path) => {
                const exportInfo = this.parseExport(path.node, false);
                componentInfo.exports.push(exportInfo);
            },

            FunctionDeclaration: (path) => {
                if (this.isReactComponent(path.node)) {
                    componentInfo.type = 'functional';
                    componentInfo.name = path.node.id?.name || componentInfo.name;
                }
            },

            VariableDeclarator: (path) => {
                if (this.isReactFunctionalComponent(path.node)) {
                    componentInfo.type = 'functional';
                    if (t.isIdentifier(path.node.id)) {
                        componentInfo.name = path.node.id.name;
                    }
                }
            },

            ClassDeclaration: (path) => {
                if (this.isReactClassComponent(path.node)) {
                    componentInfo.type = 'class';
                    componentInfo.name = path.node.id?.name || componentInfo.name;
                }
            },

            CallExpression: (path) => {
                if (t.isIdentifier(path.node.callee)) {
                    const callName = path.node.callee.name;
                    if (this.reactHooks.includes(callName)) {
                        componentInfo.hooks.push(callName);
                        if (callName === 'useState') {
                            componentInfo.stateUsage = true;
                        }
                    }
                }
            },

            JSXElement: (path) => {
                if (t.isJSXIdentifier(path.node.openingElement.name)) {
                    const elementName = path.node.openingElement.name.name;
                    if (!componentInfo.jsxElements.includes(elementName)) {
                        componentInfo.jsxElements.push(elementName);
                    }
                }
            },

            JSXFragment: (path) => {
                if (!componentInfo.jsxElements.includes('Fragment')) {
                    componentInfo.jsxElements.push('Fragment');
                }
            },

            Identifier: (path) => {
                if (path.node.name === 'props' && path.isReferencedIdentifier()) {
                    componentInfo.propsUsage = true;
                }
            }
        });

        // Remove duplicates
        componentInfo.hooks = [...new Set(componentInfo.hooks)];
        componentInfo.jsxElements = [...new Set(componentInfo.jsxElements)];

        return componentInfo;
    }

    private isReactFile(code: string): boolean {
        return /import\s+.*?react/i.test(code) ||
            /from\s+['"]react['"]/.test(code) ||
            /<[A-Z]/.test(code) ||
            /jsx/i.test(code);
    }

    private parseImport(node: t.ImportDeclaration): ImportInfo {
        const importInfo: ImportInfo = {
            source: node.source.value,
            specifiers: [],
            isDefault: false,
            isNamespace: false
        };

        node.specifiers.forEach(spec => {
            if (t.isImportDefaultSpecifier(spec)) {
                importInfo.specifiers.push(spec.local.name);
                importInfo.isDefault = true;
            } else if (t.isImportNamespaceSpecifier(spec)) {
                importInfo.specifiers.push(spec.local.name);
                importInfo.isNamespace = true;
            } else if (t.isImportSpecifier(spec)) {
                importInfo.specifiers.push(spec.local.name);
            }
        });

        return importInfo;
    }

    private parseExport(node: t.ExportDefaultDeclaration | t.ExportNamedDeclaration, isDefault: boolean): ExportInfo {
        let name = 'unknown';
        let type: 'component' | 'function' | 'variable' | 'unknown' = 'unknown';

        if (isDefault && t.isExportDefaultDeclaration(node)) {
            if (t.isFunctionDeclaration(node.declaration)) {
                name = node.declaration.id?.name || 'default';
                type = 'function';
            } else if (t.isIdentifier(node.declaration)) {
                name = node.declaration.name;
            }
        }

        return { name, isDefault, type };
    }

    private isReactComponent(node: t.FunctionDeclaration): boolean {
        return node.id?.name ? /^[A-Z]/.test(node.id.name) : false;
    }

    private isReactFunctionalComponent(node: t.VariableDeclarator): boolean {
        if (t.isIdentifier(node.id) && /^[A-Z]/.test(node.id.name)) {
            return t.isArrowFunctionExpression(node.init) || t.isFunctionExpression(node.init);
        }
        return false;
    }

    private isReactClassComponent(node: t.ClassDeclaration): boolean {
        if (!node.superClass) return false;

        if (t.isIdentifier(node.superClass)) {
            return node.superClass.name === 'Component' || node.superClass.name === 'PureComponent';
        }

        if (t.isMemberExpression(node.superClass)) {
            return t.isIdentifier(node.superClass.object) &&
                node.superClass.object.name === 'React' &&
                t.isIdentifier(node.superClass.property) &&
                (node.superClass.property.name === 'Component' || node.superClass.property.name === 'PureComponent');
        }

        return false;
    }
}
