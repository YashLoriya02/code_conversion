import { Request, Response } from 'express';
import { GitHubService } from '../services/githubService';

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
}
