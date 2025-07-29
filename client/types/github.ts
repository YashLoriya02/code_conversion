export interface GitHubFile {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string | null;
    type: 'file' | 'dir';
    content?: string;
    encoding?: string;
    _links: {
        self: string;
        git: string;
        html: string;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
