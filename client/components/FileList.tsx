'use client';

import React, { useState } from 'react';
import { GitHubFile } from '../types/github';
import { File, Folder, Eye, Download, Search, LayoutList, Loader2 } from 'lucide-react';

interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'dir';
    children?: TreeNode[];
    file?: GitHubFile;
}

const buildTree = (files: GitHubFile[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const map = new Map<string, TreeNode>();
    for (const file of files) {
        const parts = file.path.split('/');
        let current = root;
        parts.forEach((part, idx) => {
            const subPath = parts.slice(0, idx + 1).join('/');
            let node = map.get(subPath);
            if (!node) {
                node = {
                    name: part,
                    path: subPath,
                    type: idx === parts.length - 1 ? 'file' : 'dir',
                    children: idx === parts.length - 1 ? undefined : [],
                    file: idx === parts.length - 1 ? file : undefined,
                };
                map.set(subPath, node);
                current.push(node);
            }
            if (node.type === 'dir' && node.children) current = node.children;
        });
    }
    return root;
};

const TreeView: React.FC<{
    treeData: TreeNode[];
    onViewFile: (file: GitHubFile) => void;
}> = ({ treeData, onViewFile }) => {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<string | null>(null);

    const toggle = (path: string) => {
        setExpanded(prev => {
            const s = new Set(prev);
            s.has(path) ? s.delete(path) : s.add(path);
            return s;
        });
    };

    const renderTree = (nodes: TreeNode[], depth = 0) => (
        <ul className="space-y-1 pl-2 border-l border-gray-700 ml-2">
            {nodes.map(node => (
                <li key={node.path} className={`relative group`}>
                    {node.type === 'dir' ? (
                        <div
                            className={`flex items-center p-1 rounded cursor-pointer transition-all
                hover:bg-blue-900 hover:text-blue-200 select-none space-x-2 ml-${depth}`}
                            onClick={() => toggle(node.path)}
                            aria-expanded={expanded.has(node.path)}
                        >
                            <span>{expanded.has(node.path) ? "▼" : "▶"}</span>
                            <Folder className="w-4 h-4 text-blue-300" />
                            <span className="font-semibold text-blue-200">{node.name}</span>
                            <span className="ml-2 text-xs text-blue-400">
                                {(node.children?.length || 0) > 0 ? `${node.children?.length} items` : ''}
                            </span>
                        </div>
                    ) : (
                        <div
                            className={`flex items-center p-1 pl-${depth * 2} rounded space-x-2 transition-all
                ${selected === node.path
                                    ? 'bg-gradient-to-l from-blue-700 via-blue-800 to-gray-900 text-blue-100 shadow ring-2 ring-blue-400'
                                    : 'hover:bg-gray-800 hover:text-blue-100'
                                }`}
                            onClick={() => {
                                setSelected(node.path);
                                node.file && onViewFile(node.file);
                            }}
                            tabIndex={0}
                            aria-label={`View file ${node.name}`}
                        >
                            <File className="w-4 h-4 text-blue-400" />
                            <span className="truncate max-w-[160px]" title={node.name}>{node.name}</span>
                            {node.file && (
                                <button className="ml-auto px-2 py-0.5 text-xs rounded bg-blue-600 text-white shadow hover:bg-blue-700 transition">
                                    View
                                </button>
                            )}
                        </div>
                    )}
                    {node.type === 'dir' && expanded.has(node.path) && node.children && node.children.length > 0 && (
                        <div className="transition-all duration-200">
                            {renderTree(node.children, depth + 1)}
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl max-h-[60vh] overflow-auto shadow-inner border border-gray-700">
            {renderTree(treeData)}
        </div>
    );
};

interface FileListProps {
    files: GitHubFile[];
    onViewFile: (file: GitHubFile) => void;
}

const FileList: React.FC<FileListProps> = ({ files, onViewFile }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExtension, setSelectedExtension] = useState('');
    const [viewTree, setViewTree] = useState(false);
    const [loading, setLoading] = useState(false);
    const [index, setIndex] = useState(-1);

    const filteredFiles = files.filter(file => {
        const matchesSearch = file.path.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesExtension = selectedExtension === '' || file.name.endsWith(selectedExtension);
        return matchesSearch && matchesExtension;
    });

    const extensions = Array.from(
        new Set(
            files
                .map(file => {
                    const ext = file.name.split('.').pop();
                    return ext ? `.${ext}` : '';
                })
                .filter(Boolean)
        )
    ).sort();

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const isDirectory = !extension;
        return isDirectory
            ? <Folder className="w-4 h-4 text-blue-400" />
            : <File className="w-4 h-4 text-gray-400" />;
    };

    const handleDownload = async (url: string, fileName: string, idx: number) => {
        try {
            setLoading(true)
            setIndex(idx)

            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error('Network response was not ok');

            const blob = await response.blob();

            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
            setLoading(false)
        } catch (error) {
            console.error('Download failed:', error);
            // toast.error('Failed to download file.');
            setLoading(false)
        }
    };


    const treeData = buildTree(filteredFiles);

    return (
        <div className="bg-gray-900 min-h-[600px] rounded-3xl shadow-2xl px-6 py-8">
            {/* Header */}
            <div className="mb-2 flex flex-col md:flex-row justify-between items-center md:space-x-12">
                <div>
                    <h2 className="text-3xl font-extrabold text-white">Repository Explorer</h2>
                    <p className="text-gray-400 mt-1">Beautifully browse, filter, and explore all repository files and folders.</p>
                </div>
                <div className="flex items-center gap-5 mt-6 md:mt-0">
                    <div className="flex flex-col">
                        <span className="text-lg text-gray-200 font-bold text-right">{filteredFiles.length}</span>
                        <span className="text-xs text-gray-400 text-right">Matching Files</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 py-4 rounded-2xl bg-opacity-80">
                <div className="relative w-full sm:w-auto flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search files or path..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 rounded-lg w-full bg-gray-800 text-blue-100 placeholder-gray-400 outline-none border-none focus:shadow-md transition"
                    />
                </div>

                <select
                    value={selectedExtension}
                    onChange={e => setSelectedExtension(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-blue-100 border border-gray-700 focus:ring-2 focus:ring-blue-500 transition"
                >
                    <option value="">All extensions</option>
                    {extensions.map(ext => (
                        <option key={ext} value={ext}>{ext}</option>
                    ))}
                </select>

                <button
                    title={`Switch to ${viewTree ? "list" : "tree"} view`}
                    onClick={() => setViewTree(!viewTree)}
                    className={`flex items-center px-5 py-2 gap-2 rounded-xl shadow font-semibold transition text-sm 
            ${viewTree
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-900 text-blue-200 border border-blue-700 hover:bg-blue-900"
                        }`}
                >
                    <LayoutList className="w-5 h-5" />
                    {viewTree ? "List View" : "Tree View"}
                </button>
            </div>

            {/* Files (table) or Tree (hierarchy) */}
            <div className="transition-all">
                {viewTree ? (
                    <TreeView treeData={treeData} onViewFile={onViewFile} />
                ) : (
                    <div className="overflow-x-auto rounded-2xl shadow-inner">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-blue-900">
                                    <th className="py-3 px-4 text-gray-200 font-semibold">Name</th>
                                    <th className="py-3 px-4 text-gray-200 font-semibold max-w-[220px]">Path</th>
                                    <th className="py-3 px-4 text-gray-200 font-semibold">Size</th>
                                    <th className="py-3 px-4 text-gray-200 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFiles.map((file, idx) => (
                                    <tr
                                        key={file.sha}
                                        className={`border-b border-gray-800 group ${idx % 2 === 0 ? "bg-gray-900" : "bg-gray-800"}`}
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center space-x-2">
                                                {getFileIcon(file.name)}
                                                <span className="text-base text-blue-100 font-medium">{file.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 max-w-[220px] truncate" title={file.path}>
                                            <span className="text-xs text-gray-400 font-mono">{file.path}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm text-blue-300">{formatFileSize(file.size)}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onViewFile(file)}
                                                    className="flex items-center px-3 py-1 gap-1 text-base bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    <span>View</span>
                                                </button>
                                                <button
                                                    disabled={loading}
                                                    onClick={() => handleDownload(file.download_url!, file.name, idx)}
                                                    className="flex items-center px-3 py-1 gap-1 text-base bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition"
                                                >
                                                    {
                                                        loading && idx === index
                                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                                            : <Download className="w-4 h-4" />
                                                    }
                                                    <span>Download</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredFiles.length === 0 && (
                            <div className="text-center py-10 text-blue-300 text-lg">No files found matching your criteria.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileList;
