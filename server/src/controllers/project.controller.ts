// Controller for adding features in future 

import { Request, Response } from 'express';
import { FileParserService } from '../services/fileParserService';
import { ConversionStrategyService } from '../services/conversionStrategyService';
import fs from 'fs';

export class ProjectController {
    private fileParserService: FileParserService;
    private conversionStrategyService: ConversionStrategyService;

    constructor() {
        this.fileParserService = new FileParserService();
        this.conversionStrategyService = new ConversionStrategyService();
    }

    analyzeProject = async (req: Request, res: Response): Promise<void> => {
        try {
            const { projectPath } = req.body;

            if (!projectPath || !fs.existsSync(projectPath)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid project path provided'
                });
                return;
            }

            const parsedProject = await this.fileParserService.parseProject(projectPath);

            const analysis = this.conversionStrategyService.analyzeProject(parsedProject);

            res.json({
                success: true,
                data: {
                    parsing: parsedProject,
                    analysis: analysis
                }
            });

        } catch (error) {
            console.error('Project analysis error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Analysis failed'
            });
        }
    };

    // getComponentDetails = async (req: Request, res: Response): Promise<void> => {
    //     try {
    //         const { componentName, projectPath } = req.params;

    //         const parsedProject = await this.fileParserService.parseProject(projectPath);
    //         const component = parsedProject.components.find(c => c.name === componentName);

    //         if (!component) {
    //             res.status(404).json({
    //                 success: false,
    //                 error: 'Component not found'
    //             });
    //             return;
    //         }

    //         const strategy = this.conversionStrategyService.analyzeProject(parsedProject)
    //             .conversionStrategies.find(s => s.componentName === componentName);

    //         res.json({
    //             success: true,
    //             data: {
    //                 component,
    //                 strategy
    //             }
    //         });

    //     } catch (error) {
    //         res.status(500).json({
    //             success: false,
    //             error: error instanceof Error ? error.message : 'Failed to get component details'
    //         });
    //     }
    // };
}
