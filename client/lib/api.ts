import axios from 'axios';
import { GitHubFile, ApiResponse } from '../types/github';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const githubApi = {
    getRepoFiles: async (repoUrl: string, token: string): Promise<ApiResponse<GitHubFile[]>> => {
        try {
            const response = await api.post('/github/files', { repoUrl, token });
            return response.data;
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response) {
                return error.response.data;
            }
            return { success: false, error: 'Network error occurred' };
        }
    },

    getFileContent: async (repoUrl: string, filePath: string, token: string): Promise<ApiResponse<string>> => {
        try {
            const response = await api.post('/github/file-content', { repoUrl, filePath, token });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                return error.response.data;
            }
            return { success: false, error: 'Network error occurred' };
        }
    },
};

export const projectApi = {
    analyzeProject: async (projectPath: string) => {
        const response = await axios.post(`${API_BASE_URL}/project/analyze`, {
            projectPath
        });
        return response.data;
    }
};

export const getProfile = async (id: string) => {
    const response = await api.get(`/auth/profile/${id}`);
    return response.data;
};