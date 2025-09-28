'use client';

import React, { useEffect, useState } from 'react';
import { GitHubFile } from '../../types/github';
import { getProfile, githubApi } from '../../lib/api';
import FileList from '../../components/FileList';
import FileViewer from '../../components/FileViewer';
import { Github, Search, AlertCircle, Loader2, User, LogOut } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
    const [repoUrl, setRepoUrl] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [files, setFiles] = useState<GitHubFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<GitHubFile | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const params = useSearchParams();
    const router = useRouter();
    const id = params.get('id');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const data = await getProfile(id ?? localStorage.getItem('session-id') ?? "");

                localStorage.setItem('session-id', data._id);
                localStorage.setItem('session-gname', data.username);

                if (id) {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('id');
                    window.history.replaceState({}, document.title, url);
                }
            } catch (err) {
                console.log("Error in fetching data")
            }
        };

        if (localStorage.getItem('session-id') || id) {
            fetchUser();
        }
        else {
            router.push("/")
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repoUrl.trim()) return;

        setLoading(true);
        setError('');
        setFiles([]);

        try {
            const result = await githubApi.getRepoFiles(repoUrl.trim(), accessToken.trim());

            if (result.success && result.data) {
                setFiles(result.data);
            } else {
                setError(result.error || 'Failed to fetch repository files');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleViewFile = async (file: GitHubFile) => {
        setSelectedFile(file);
        setFileContent('Loading...');

        try {
            const result = await githubApi.getFileContent(repoUrl, file.path, accessToken.trim());

            if (result.success && result.data) {
                setFileContent(result.data);
            } else {
                setFileContent('Failed to load file content');
            }
        } catch (err) {
            setFileContent('Error loading file content');
        }
    };

    const handleCloseViewer = () => {
        setSelectedFile(null);
        setFileContent('');
    };

    const handleLogout = async () => {
        try {
            localStorage.removeItem("session-id")
            localStorage.removeItem("session-gname")
            router.push('/');
        } catch (err) {
            setError('Logout failed.');
        }
    };


    return (
        <main className="min-h-screen bg-gray-800">
            <div className='absolute top-5 right-5 flex gap-3 items-center'>
                <Link href={'/profile'} className='flex gap-3 items-center bg-[#1b1717b4] px-4 py-3 rounded-2xl'>
                    <User className='h-5 w-5' />
                </Link>

                <button
                    onClick={handleLogout}
                    className="bg-[#1b1717b4] cursor-pointer text-white py-3 px-4 rounded-2xl flex items-center gap-2"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
            <div className="container mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                        <Github className="w-8 h-8 text-white" />
                        <h1 className="text-3xl font-bold text-white">GitHub Repository Explorer</h1>
                    </div>
                    <p className="text-gray-300 max-w-2xl mx-auto">
                        Enter a GitHub repository URL to explore all files in the repository.
                        You can view file contents, download files, and search through the repository structure.
                    </p>
                </div>

                <div className="max-w-3xl mx-auto mb-8">
                    <form onSubmit={handleSubmit} className="bg-[#c0bfc711] rounded-lg shadow-lg pt-12 px-16 pb-16">
                        <div className="mb-4">
                            <label htmlFor="repoUrl" className="block text-md text-gray-100 mb-1 ml-1">
                                GitHub Repository URL
                            </label>
                            <div className="relative">
                                <input
                                    type="url"
                                    id="repoUrl"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    placeholder="https://github.com/username/repository"
                                    className="w-full text-gray-200 p-3 border-2 border-gray-400 rounded-lg placeholder:text-gray-400 focus:outline-none"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="my-4">
                                <label htmlFor="accessToken" className="block text-md font-medium text-gray-100 mb-1 ml-1">
                                    GitHub Personal Access Token (optional, required only for private repos)
                                </label>
                                <input
                                    type="password"
                                    id="accessToken"
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    className="w-full px-4 focus:outline-none py-3 border-2 border-gray-400 rounded-lg"
                                    disabled={loading}
                                />
                                <p className="text-xs text-red-400 mt-1 ml-1">
                                    Required for private repositories. Generate at: Settings → Developer settings → Personal access tokens
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !repoUrl.trim()}
                            className="w-full mt-6 flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Exploring Repository...</span>
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" />
                                    <span>Explore Repository</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="max-w-2xl mx-auto mb-8">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                <p className="text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {files.length > 0 && (
                    <FileList files={files} onViewFile={handleViewFile} />
                )}

                {selectedFile && (
                    <FileViewer
                        file={selectedFile}
                        content={fileContent}
                        onClose={handleCloseViewer}
                    />
                )}
            </div>
        </main>
    );
}
