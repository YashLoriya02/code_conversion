'use client';

import React from 'react';
import { GitHubFile } from '../types/github';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SyntaxHighlighter from 'react-syntax-highlighter';

interface FileViewerProps {
    file: GitHubFile;
    content: string;
    onClose: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ file, content, onClose }) => {
    const getLanguage = (fileName: string): string => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const languageMap: { [key: string]: string } = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            py: 'python',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            cs: 'csharp',
            php: 'php',
            rb: 'ruby',
            go: 'go',
            rs: 'rust',
            swift: 'swift',
            kt: 'kotlin',
            scala: 'scala',
            sh: 'bash',
            yml: 'yaml',
            yaml: 'yaml',
            json: 'json',
            xml: 'xml',
            html: 'html',
            css: 'css',
            scss: 'scss',
            sass: 'sass',
            less: 'less',
            md: 'markdown',
            sql: 'sql',
        };
        return languageMap[extension || ''] || 'text';
    };

    const isLoading = content === 'Loading...';

    return (
        <div className="fixed inset-0 bg-[#000000e8] bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1F2029] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-400">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{file.name}</h3>
                        <p className="text-sm text-gray-300 font-mono">{file.path}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <a
                            href={file.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-900 rounded hover:bg-gray-200 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span>Open in GitHub</span>
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 text-white cursor-pointer transition-colors"
                            aria-label="Close file viewer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center space-y-3 text-white">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <p className="text-lg font-medium">Loading content...</p>
                        </div>
                    ) : (
                        <pre className="bg-[#1f2029] no-scrollbar rounded-lg p-4 overflow-auto text-sm w-full max-h-[70vh]">
                            <SyntaxHighlighter
                                language={getLanguage(file.name)}
                                style={vscDarkPlus}
                                className="no-scrollbar"
                                customStyle={{
                                    margin: 0,
                                    padding: '1rem',
                                    border: '1px solid rgba(75, 85, 99, 0.5)',
                                    borderRadius: '0.75rem',
                                    backgroundColor: '#1f2029',
                                    color: "white"
                                }}
                                wrapLongLines={true}
                                showLineNumbers={true}
                                lineNumberStyle={{
                                    color: 'gray',
                                    paddingRight: '1rem',
                                    marginRight: '1rem',
                                    borderRight: '1px solid #374151',
                                    minWidth: '2.5rem',
                                }}
                            >
                                {content}
                            </SyntaxHighlighter>
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileViewer;
