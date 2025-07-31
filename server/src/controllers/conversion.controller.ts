import { Request, Response } from 'express';
import { FileParserService } from '../services/fileParserService';
import { ConversionStrategyService } from '../services/conversionStrategyService';
import { LLMConversionService } from '../services/llmConversionService';
import { GitHubService } from '../services/githubService';

export class ConversionController {
    private fileParserService: FileParserService;
    private conversionStrategyService: ConversionStrategyService;
    private llmConversionService: LLMConversionService;
    private githubService: GitHubService;

    constructor() {
        this.fileParserService = new FileParserService();
        this.conversionStrategyService = new ConversionStrategyService();
        this.llmConversionService = new LLMConversionService();
        this.githubService = new GitHubService();
    }

    convertComponent = async (req: Request, res: Response): Promise<void> => {
        try {
            const { repoUrl, token, componentName, filePath } = req.body;

            const repoInfo = this.githubService.parseGitHubUrl(repoUrl);
            if (!repoInfo) {
                res.status(400).json({ success: false, error: 'Invalid GitHub URL' });
                return;
            }

            const githubService = new GitHubService(token);

            // Get file content
            const contentResult = await githubService.getFileContent(repoInfo, filePath);
            if (!contentResult.success || !contentResult.data) {
                res.status(400).json({ success: false, error: 'Failed to fetch file content' });
                return;
            }

            const parsedProject = await this.fileParserService.parseProject('temp');
            const component = parsedProject.components.find(c => c.name === componentName);

            if (component) {
                const analysis = this.conversionStrategyService.analyzeProject(parsedProject);
                const strategy = analysis.conversionStrategies.find(s => s.componentName === componentName);

                if (strategy) {
                    // Use intelligent conversion
                    const result = await this.llmConversionService.convertComponent(
                        component,
                        strategy,
                        contentResult.data
                    );

                    res.json({ success: true, data: result });
                    return;
                }
            }

            // Fallback to basic conversion
            const convertedCode = await this.llmConversionService.convertReactCodeToReactNative(contentResult.data);

            res.json({
                success: true,
                data: {
                    originalCode: contentResult.data,
                    convertedCode,
                    changes: ['Basic React to React Native conversion applied'],
                    warnings: ['Component analysis not available - basic conversion used'],
                    success: true,
                    confidence: 75
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Conversion failed'
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
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Conversion failed'
            });
        }
    };
}
