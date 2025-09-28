import path from 'path';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import JSZip from 'jszip';

import { LLMConversionService } from './llmConversionService';
import { AssemblyService } from './assembly.service';

interface GitHubFile {
    path: string;
    download_url: string | null;
    type: 'file' | 'dir';
}

type FileType = 'COMPONENT' | 'PAGE' | 'HOOK' | 'UTIL' | 'ASSET' | 'STYLESHEET' | 'PACKAGE' | 'CONFIG' | 'OTHER';

interface ManifestItem {
    filePath: string;
    downloadUrl: string | null;
    fileType: FileType;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    newPath: string | null;
    convertedContent: string | Buffer | null;
    error: string | null;
}

export class MainConversionService {
    private llmConversionService: LLMConversionService;
    private assemblyService: AssemblyService;
    private authToken: string;

    constructor(token: string) {
        this.llmConversionService = new LLMConversionService();
        this.assemblyService = new AssemblyService();
        this.authToken = token
    }

    // Helper function for Phase 1
    private async processManifestItem(item: ManifestItem): Promise<void> {
        try {
            const response = await fetch(item.downloadUrl!, {
                headers: {
                    'Authorization': `token ${this.authToken}`,
                    'Accept': 'application/vnd.github.v3.raw'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status} for ${item.filePath}`);

            switch (item.fileType) {
                case 'COMPONENT':
                case 'PAGE':
                case 'HOOK':
                case 'UTIL':
                    const sourceCode = await response.text();
                    item.convertedContent = await this.llmConversionService.convertCodeWithContext(
                        sourceCode,
                        item.fileType
                    );
                    break;

                case 'ASSET':
                    // Assets are downloaded as a raw buffer
                    item.convertedContent = await response.buffer();
                    break;

                case 'PACKAGE':
                case 'STYLESHEET':
                    // These are processed as text during the assembly phase
                    item.convertedContent = await response.text();
                    break;

                default:
                    // For 'OTHER', 'CONFIG' just copy the content
                    item.convertedContent = await response.text();
                    break;
            }
            item.status = 'SUCCESS';
        } catch (error: any) {
            item.status = 'FAILED';
            item.error = error.message;
        }
    }

    // PHASE 1: Creating Conversion Manifest
    public async createConversionManifest(allFiles?: GitHubFile[]): Promise<ManifestItem[]> {
        const manifest: ManifestItem[] = [];
        const assetExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.GIF', '.ttf', '.webp'];
        const styleExtensions = ['.css', '.scss'];
        const scriptExtensions = ['.js', '.jsx'];

        for (const file of (allFiles ?? [])) {
            if (file.type !== 'file' || !file.download_url) continue;

            const ext = path.extname(file.path).toLowerCase();
            let fileType: FileType = 'OTHER';
            let newPath: string | null = file.path;

            if (scriptExtensions.includes(ext)) {
                if (file.path.startsWith('src/components/')) {
                    fileType = 'COMPONENT';
                } else if (file.path.startsWith('src/pages/') || file.path.startsWith('src/views/')) {
                    fileType = 'PAGE';
                    newPath = file.path.replace('src/pages/', 'src/screens/').replace('src/views/', 'src/screens/');
                } else if (path.basename(file.path).startsWith('use')) {
                    fileType = 'HOOK';
                } else {
                    fileType = 'UTIL';
                }
            } else if (assetExtensions.includes(ext)) {
                fileType = 'ASSET';
                newPath = `src/assets/images/${path.basename(file.path)}`;
            } else if (styleExtensions.includes(ext)) {
                fileType = 'STYLESHEET';
                newPath = null;
            } else if (path.basename(file.path) === 'package.json') {
                fileType = 'PACKAGE';
            } else if (path.basename(file.path).endsWith('.config.js')) {
                fileType = 'CONFIG';
            }

            manifest.push({
                filePath: file.path,
                downloadUrl: file.download_url,
                fileType,
                status: 'PENDING',
                newPath,
                convertedContent: null,
                error: null,
            });
        }
        return manifest;
    }

    // PHASE 2: Running Parallel Conversion
    public async runParallelConversion(manifest: ManifestItem[]): Promise<ManifestItem[]> {
        const limit = pLimit(10);

        const conversionPromises = manifest.map(item =>
            limit(() => this.processManifestItem(item))
        );

        await Promise.all(conversionPromises);
        return manifest;
    }

    // PHASE 3: Assembling & Packaging Project
    public async assembleProject(manifest: ManifestItem[]): Promise<Buffer> {
        const zip = new JSZip();

        const packageJsonItem = manifest.find(item => item.fileType === 'PACKAGE');
        if (packageJsonItem) {
            const newPackageJson = this.assemblyService.transformPackageJson(packageJsonItem.convertedContent as string, true);
            zip.file('package.json', newPackageJson);
        }

        const pages = manifest.filter(item => item.fileType === 'PAGE' && item.status === 'SUCCESS');
        const appNavigator = this.assemblyService.createRootNavigator(pages);
        zip.file('App.js', appNavigator);

        zip.file('index.js', this.assemblyService.createIndexJs());

        for (const item of manifest) {
            if (item.status === 'SUCCESS' && item.newPath && item.convertedContent) {
                zip.file(item.newPath, item.convertedContent);
            }
        }

        return zip.generateAsync({ type: 'nodebuffer' });
    }
}
