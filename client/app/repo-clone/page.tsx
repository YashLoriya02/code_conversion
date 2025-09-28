'use client'

import axios from 'axios'
import { Loader2 } from 'lucide-react';
import React, { useState } from 'react'

const RepoClone = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post('http://localhost:5000/api/conversion/end-to-end', {
                "repoUrl": "https://github.com/YashLoriya02/co-comm-reg-client",
                "token": "",
                "userId": "68d04b320611b93741e541f7"
            }, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));

            const link = document.createElement('a');
            link.href = url;

            link.setAttribute('download', 'converted-project.zip');

            document.body.appendChild(link);
            link.click();

            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (err: any) {
            console.error("Download failed:", err);
            setError("Failed to generate and download the project. Please check the console for details.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div>
            <button
                onClick={handleDownload}
                disabled={isLoading}
                type="button"
                className="w-[90%] mx-auto mt-14 flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? (
                    <>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <span>Processing...</span>
                    </>
                ) : (
                    <span>Download Converted Project</span>
                )}
            </button>
            {error && (
                <p className="text-red-500 text-center mt-4">{error}</p>
            )}
        </div>
    )
}

export default RepoClone;
