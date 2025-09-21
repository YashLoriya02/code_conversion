import { Request, Response } from 'express';
import { GitHubService } from '../services/githubService';
import axios from 'axios';
import User from '../models/auth.model';

export class GitHubController {
    getRepoFiles = async (req: Request, res: Response): Promise<void> => {
        try {
            const { repoUrl, token } = req.body;

            if (!repoUrl) {
                res.status(400).json({ success: false, error: 'Repository URL is required' });
                return;
            }

            const githubService = new GitHubService(token);
            const repoInfo = githubService.parseGitHubUrl(repoUrl);
            if (!repoInfo) {
                res.status(400).json({ success: false, error: 'Invalid GitHub URL format' });
                return;
            }

            const result = await githubService.getAllFiles(repoInfo);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };

    getFileContent = async (req: Request, res: Response): Promise<void> => {
        try {
            const { repoUrl, filePath, token } = req.body;

            if (!repoUrl || !filePath) {
                res.status(400).json({ success: false, error: 'Repository URL and file path are required' });
                return;
            }

            const githubService = new GitHubService(token);
            const repoInfo = githubService.parseGitHubUrl(repoUrl);
            if (!repoInfo) {
                res.status(400).json({ success: false, error: 'Invalid GitHub URL format' });
                return;
            }

            const result = await githubService.getFileContent(repoInfo, filePath);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };

    createRepo = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const {
                name,
                description = '',
                private: isPrivate = false
            } = req.body || {};

            if (!name) {
                res.status(400).json({ error: "Field 'name' is required" });
                return
            }

            const user = await User.findById(id);
            if (!user || !user.accessToken) {
                res.status(401).json({ error: 'Missing or invalid user/token' });
                return
            }

            const gh = axios.create({
                baseURL: 'https://api.github.com',
                headers: {
                    Authorization: `Bearer ${user.accessToken}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'repo-api'
                },
                timeout: 15000
            });

            const who = await gh.get('/user');
            const scopes = who.headers['x-oauth-scopes'] || '';

            if (isPrivate && !String(scopes).includes('repo')) {
                res.status(403).json({
                    error: 'Insufficient scopes',
                    detail: `Token scopes: ${scopes}. Need 'repo' for private repo creation.`
                });
                return
            }

            if (!isPrivate && !String(scopes).match(/\b(public_repo|repo)\b/)) {
                res.status(403).json({
                    error: 'Insufficient scopes',
                    detail: `Token scopes: ${scopes}. Need 'public_repo' or 'repo' for public repo creation.`
                });
                return
            }

            const { data } = await gh.post('/user/repos', {
                name,
                description,
                private: !!isPrivate,
                auto_init: true
            });

            res.status(201).json({
                message: 'Repository created',
                full_name: data.full_name,
                html_url: data.html_url,
                clone_url: data.clone_url,
                private: data.private,
            });
        } catch (e: any) {
            const status = e?.response?.status || 500;
            res.status(status).json({
                error: 'GitHub API error',
                detail: e?.response?.data || { message: e.message }
            });
            return
        }
    }
}
