import { GitHubFile, GitHubTreeResponse, RepoInfo, ApiResponse } from '../types/github';

export class GitHubService {
    private baseUrl = 'https://api.github.com';
    private token?: string;

    constructor(token?: string) {
        this.token = token;
    }

    parseGitHubUrl(url: string): RepoInfo | null {
        try {
            const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/;
            const match = url.match(regex);

            if (!match) return null;

            return {
                owner: match[1],
                repo: match[2].replace('.git', ''),
                branch: match[3] || 'main'
            };
        } catch (error) {
            return null;
        }
    }

    private getHeaders() {
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Repo-Explorer'
        };

        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }

        return headers;
    }

    async getAllFiles(repoInfo: RepoInfo): Promise<ApiResponse<GitHubFile[]>> {
        try {
            const treeUrl = `${this.baseUrl}/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${repoInfo.branch}?recursive=1`;

            const response = await fetch(treeUrl, { headers: this.getHeaders() });

            if (!response.ok) {
                if (response.status === 404) {
                    return { success: false, error: 'Repository not found or Private Repository' };
                }
                return { success: false, error: `GitHub API error: ${response.statusText}` };
            }

            const treeData: GitHubTreeResponse = await response.json();

            const files: GitHubFile[] = treeData.tree
                .filter(item => item.type === 'blob')
                .map(item => ({
                    name: item.path.split('/').pop() || item.path,
                    path: item.path,
                    sha: item.sha,
                    size: item.size || 0,
                    url: item.url,
                    html_url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${repoInfo.branch}/${item.path}`,
                    git_url: item.url,
                    download_url: `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${repoInfo.branch}/${item.path}`,
                    type: 'file' as const,
                    _links: {
                        self: item.url,
                        git: item.url,
                        html: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${repoInfo.branch}/${item.path}`
                    }
                }));

            return { success: true, data: files };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    async getFileContent(repoInfo: RepoInfo, filePath: string): Promise<ApiResponse<string>> {
        try {
            const contentUrl = `${this.baseUrl}/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${filePath}?ref=${repoInfo.branch}`;

            const response = await fetch(contentUrl, { headers: this.getHeaders() });

            if (!response.ok) {
                return { success: false, error: `Failed to fetch file content: ${response.statusText}` };
            }

            const fileData = await response.json();

            if (fileData.content) {
                const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                return { success: true, data: content };
            }

            return { success: false, error: 'File content not available' };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch file content'
            };
        }
    }
}
