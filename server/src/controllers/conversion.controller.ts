import { Request, Response } from 'express';
import { LLMConversionService } from '../services/llmConversionService';
import { GitHubService } from '../services/githubService';
import { MainConversionService } from '../services/mainConversionService';
import User from "../models/auth.model"

export class ConversionController {
    private llmConversionService: LLMConversionService;
    private githubService: GitHubService;

    constructor() {
        this.llmConversionService = new LLMConversionService();
        this.githubService = new GitHubService();
    }

    convertComponent = async (req: Request, res: Response): Promise<void> => {
        try {
            const { repoUrl, userId } = req.body;

            const user = await User.findById(userId);
            const token = user?.accessToken;

            if (!token) {
                res.status(401).json({
                    success: false,
                    error: 'GitHub access token not found for user',
                });
                return;
            }

            const repoInfo = this.githubService.parseGitHubUrl(repoUrl);

            if (!repoInfo) {
                res.status(400).json({ success: false, error: 'Invalid GitHub URL' });
                return;
            }

            const githubService = new GitHubService(token);
            const allFilesResponse = await githubService.getAllFiles(repoInfo);

            if (!allFilesResponse.success || !allFilesResponse.data) {
                res.status(400).json({
                    success: false,
                    error: allFilesResponse.error || 'Failed to fetch repository files',
                });
                return;
            }

            const allFiles = allFilesResponse.data;

            const conversionService = new MainConversionService(token);
            const manifest = await conversionService.createConversionManifest(allFiles);
            const completedManifest = await conversionService.runParallelConversion(manifest);

            const { zipBuffer, report, summary } =
                await conversionService.assembleProject(completedManifest);

            const zipBase64 = zipBuffer.toString('base64');

            res.json({
                success: true,
                data: {
                    fileName: `${repoInfo.repo}-react-native.zip`,
                    zipBase64,
                    report,
                    summary,
                },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Conversion failed',
            });
        }
    };

    convertCode = async (req: Request, res: Response): Promise<void> => {
        try {
            const { code } = req.body;

            if (!code) {
                res.status(400).json({ success: false, error: 'Code is required' });
                return;
            }

            const convertedCode = await this.llmConversionService.convertReactCodeToReactNative(code);

            res.json({
                success: true,
                data: {
                    originalCode: code,
                    convertedCode,
                    changes: ['React code converted to React Native'],
                    warnings: [],
                    success: true,
                    confidence: 80
                }
            });

        } catch (error) {
            console.log(error)
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Conversion failed'
            });
        }
    };
}
