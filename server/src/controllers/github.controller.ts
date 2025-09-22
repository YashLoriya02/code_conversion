import { Request, Response } from 'express';
import { GitHubService } from '../services/githubService';
import axios from 'axios';
import User from '../models/auth.model';
import { Buffer } from "buffer";

type NewFile = {
    path: string;
    content: string;
    message?: string;
};

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

    // Helper to create/update file 
    upsertFile = async (opts: {
        gh: any;
        owner: string;
        repo: string;
        branch: string;
        path: string;
        content: string;
        message: string;
    }) => {
        const { gh, owner, repo, branch, path, content, message } = opts;

        let sha: string | undefined;
        try {
            const getRes = await gh.get(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
                params: { ref: branch },
                validateStatus: (s: number) => s === 200 || s === 404
            });
            if (getRes.status === 200 && getRes.data?.sha) {
                sha = getRes.data.sha;
            }
        } catch (_) { }

        const contentB64 = Buffer.from(content, "utf8").toString("base64");
        const body: any = { message, content: contentB64, branch };
        if (sha) body.sha = sha;

        await gh.put(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, body);
    }

    createRepo = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const {
                name,
                description = '',
                private: isPrivate = false,
                files = [] as NewFile[],
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
            const login: string = who.data?.login;
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

            let repoResp = await gh.get(`/repos/${login}/${encodeURIComponent(name)}`, {
                validateStatus: (s: number) => s === 200 || s === 404
            });

            if (repoResp.status === 404) {
                repoResp = await gh.post("/user/repos", {
                    name,
                    description,
                    private: !!isPrivate,
                    auto_init: true
                });
            }

            const repo = repoResp.data;
            const owner = repo.owner?.login || login;
            const repoName: string = repo.name;
            const defaultBranch: string = repo.default_branch || "main";

            const addedOrUpdated: string[] = [];
            for (const f of files) {
                if (!f?.path || typeof f.content !== "string") continue;
                await this.upsertFile({
                    gh,
                    owner,
                    repo: repoName,
                    branch: defaultBranch,
                    path: f.path,
                    content: f.content,
                    message: f.message || `Add/Update ${f.path}`
                });
                addedOrUpdated.push(f.path);
            }

            res.status(200).json({
                message:
                    repoResp.status === 200
                        ? "Repo existed; files added/updated"
                        : "Repo created; files added",
                full_name: repo.full_name,
                html_url: repo.html_url,
                clone_url: repo.clone_url,
                private: repo.private,
                default_branch: defaultBranch,
                files: addedOrUpdated
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
