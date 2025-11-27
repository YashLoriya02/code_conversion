'use client';

import axios from 'axios';
import {
    Loader2,
    Github,
    CheckCircle2,
    AlertCircle,
    FileDown,
    Info,
    ChevronRight,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { BiLoader } from 'react-icons/bi';

type ConversionStatus = 'idle' | 'converting' | 'success' | 'error';

interface ConversionMeta {
    repoOwner: string;
    repoName: string;
    startedAt: Date;
    finishedAt: Date;
    durationMs: number;
    zipSizeBytes: number;
}

interface ConversionSummary {
    totalFiles: number;
    convertedFiles: number;
    failedFiles: number;
    avgConfidence: number | null;
    totalWarnings: number;
}

interface ConversionReportItem {
    filePath: string;
    newPath: string | null;
    fileType: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    error: string | null;
    changes?: string[];
    warnings?: string[];
    confidence?: number;
}

const RepoClone = () => {
    const [repoUrl, setRepoUrl] = useState(
        'https://github.com/YashLoriya02/co-comm-reg-client'
    );
    const [status, setStatus] = useState<ConversionStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [meta, setMeta] = useState<ConversionMeta | null>(null);
    const [summary, setSummary] = useState<ConversionSummary | null>(null);
    const [report, setReport] = useState<ConversionReportItem[]>([]);
    const [selectedItem, setSelectedItem] =
        useState<ConversionReportItem | null>(null);

    const [zipBase64, setZipBase64] = useState<string | null>(null);
    const [downloadFileName, setDownloadFileName] = useState<string | null>(null);

    const [loaderStep, setLoaderStep] = useState(0);

    const loaderSteps = useMemo(
        () => [
            'Analyzing repository structure…',
            'Fetching project files from GitHub…',
            'Classifying components, pages, hooks & utils…',
            'Converting React components to React Native…',
            'Building navigation and root entry files…',
            'Packaging your React Native project…',
        ],
        []
    );

    const serverUrl = "http://localhost:5000"

    useEffect(() => {
        if (status !== 'converting') return;

        setLoaderStep(0);
        const interval = setInterval(() => {
            setLoaderStep((prev) =>
                prev < loaderSteps.length - 1 ? prev + 1 : prev
            );
        }, 5000);

        return () => clearInterval(interval);
    }, [status, loaderSteps.length]);

    const currentLoaderMessage = loaderSteps[loaderStep];
    const loaderProgress = loaderStep === 0 ? 0 : ((loaderStep + 1) / loaderSteps.length) * 100;

    const parseRepoUrl = (url: string) => {
        try {
            const u = new URL(url);
            if (u.hostname !== 'github.com') return null;
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length < 2) return null;
            return {
                owner: parts[0],
                name: parts[1].replace(/\.git$/, ''),
            };
        } catch {
            return null;
        }
    };

    const formatDuration = (ms: number) => {
        const sec = Math.round(ms / 1000);
        if (sec < 60) return `${sec}s`;
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return s ? `${m}m ${s}s` : `${m}m`;
    };

    const formatSizeMB = (bytes: number) => {
        if (!bytes) return '—';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const base64ToBlob = (base64: string, mime: string) => {
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mime });
    };

    const handleGenerate = async () => {
        setError(null);
        setMeta(null);
        setSummary(null);
        setReport([]);
        setSelectedItem(null);
        setZipBase64(null);
        setDownloadFileName(null);

        const parsed = parseRepoUrl(repoUrl);
        if (!parsed) {
            setError(
                'Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo).'
            );
            setStatus('error');
            return;
        }

        const startedAt = new Date();
        setStatus('converting');
        setIsLoading(true);

        try {
            const response = await axios.post(
                `${serverUrl}/api/conversion/end-to-end`,
                {
                    repoUrl,
                    userId: localStorage.getItem("session-id"),
                }
            );

            if (!response.data?.success) {
                throw new Error(response.data?.error || 'Unknown error from server');
            }

            const { fileName, zipBase64, report, summary } = response.data.data;

            const finishedAt = new Date();
            const blob = base64ToBlob(zipBase64, 'application/zip');

            setMeta({
                repoOwner: parsed.owner,
                repoName: parsed.name,
                startedAt,
                finishedAt,
                durationMs: finishedAt.getTime() - startedAt.getTime(),
                zipSizeBytes: blob.size,
            });

            setSummary(summary);
            setReport(report || []);
            setZipBase64(zipBase64);
            setDownloadFileName(fileName || `${parsed.name}-react-native.zip`);

            setStatus('success');
        } catch (err: any) {
            console.error('Conversion failed:', err);
            setError(
                err?.response?.data?.error ||
                err.message ||
                'Failed to generate conversion report.'
            );
            setStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadZip = () => {
        if (!zipBase64 || !downloadFileName) return;

        const blob = base64ToBlob(zipBase64, 'application/zip');
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', downloadFileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleRowClick = (item: ConversionReportItem) => {
        setSelectedItem((prev) =>
            prev && prev.filePath === item.filePath ? null : item
        );
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-5xl bg-slate-900/70 border border-slate-700/70 rounded-2xl shadow-2xl shadow-slate-900/70 backdrop-blur-lg p-6 md:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300 mb-3">
                            <Github className="h-3 w-3 mr-2" />
                            React → React Native Converter
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 tracking-tight">
                            Migrate your React repo to React Native
                        </h1>
                        <p className="text-sm md:text-sm leading-6 text-slate-300 mt-2 max-w-2xl">
                            Paste a GitHub URL of your React project. We&apos;ll fetch the
                            repo, convert components, pages, hooks & utils to React Native,
                            and show you a detailed conversion report. You can then download
                            the converted project as a ZIP.
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-200">
                        GitHub Repository URL
                    </label>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                                <Github className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                placeholder="https://github.com/owner/repo"
                                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-950/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm md:text-base"
                            />
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            type="button"
                            className="md:w-56 w-full flex items-center justify-center space-x-4 bg-emerald-500 text-slate-950 font-medium py-2.5 px-4 rounded-lg hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                        >
                            {isLoading ? (
                                <>
                                    <BiLoader className="h-5 w-5 animate-spin" />
                                    <span className='mt-0.5'>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <span>Run Conversion</span>
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Info className="h-3 w-3" />
                        Conversion usually takes about 1–2 minutes for medium-sized
                        projects.
                    </p>
                </div>

                {status === 'converting' && (
                    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="relative mt-0.5">
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                                <span className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-100">
                                    Converting project to React Native…
                                </p>
                                <p className="text-xs text-slate-300 mt-1">
                                    {currentLoaderMessage}
                                </p>

                                <div className="mt-3 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 transition-all duration-700"
                                        style={{ width: `${loaderProgress}%` }}
                                    />
                                </div>

                                <div className="mt-6 mb-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-[0.7rem]">
                                    {loaderSteps.map((step, index) => (
                                        <div
                                            key={step}
                                            className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${index === loaderStep
                                                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                                                    : index < loaderStep
                                                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200/80'
                                                        : 'border-slate-700/70 bg-slate-900/70 text-slate-400'
                                                }`}
                                        >
                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/80 text-[0.6rem]">
                                                {index < loaderStep ? '✓' : index + 1}
                                            </span>
                                            <span className="line-clamp-2">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'success' && meta && (
                    <div className="mt-4 rounded-xl border border-emerald-600/60 bg-emerald-950/30 px-4 py-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                <p className="text-sm font-semibold text-emerald-100">
                                    Conversion completed successfully!
                                </p>
                            </div>
                            <button
                                onClick={handleDownloadZip}
                                disabled={!zipBase64}
                                className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-emerald-500 text-black text-base font-medium hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                                <FileDown className="h-4 w-4" />
                                Download Converted Project
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs md:text-sm text-emerald-100/90 mt-1">
                            <div>
                                <p className="text-emerald-300/80 uppercase text-[0.7rem] mb-0.5">
                                    Repository
                                </p>
                                <p className="font-mono">
                                    {meta.repoOwner}/{meta.repoName}
                                </p>
                            </div>
                            <div>
                                <p className="text-emerald-300/80 uppercase text-[0.7rem] mb-0.5">
                                    Conversion Time
                                </p>
                                <p>{formatDuration(meta.durationMs)}</p>
                            </div>
                            <div>
                                <p className="text-emerald-300/80 uppercase text-[0.7rem] mb-0.5">
                                    ZIP Size (estimated)
                                </p>
                                <p>{formatSizeMB(meta.zipSizeBytes)}</p>
                            </div>
                            <div className="flex items-end justify-between md:justify-end gap-2">
                                <p className="text-[0.7rem] text-emerald-200/80">
                                    Finished at:{' '}
                                    {meta.finishedAt.toLocaleTimeString(undefined, {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'success' && summary && (
                    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3">
                        <p className="text-xs font-semibold text-slate-200 mb-2">
                            Conversion Summary
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm text-slate-100/90">
                            <div>
                                <p className="text-slate-400 text-[0.7rem] uppercase mb-0.5">
                                    Total Files
                                </p>
                                <p className="font-medium">{summary.totalFiles}</p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-[0.7rem] uppercase mb-0.5">
                                    Converted
                                </p>
                                <p className="font-medium text-emerald-300">
                                    {summary.convertedFiles}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-[0.7rem] uppercase mb-0.5">
                                    Failed
                                </p>
                                <p className="font-medium text-red-300">
                                    {summary.failedFiles}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-[0.7rem] uppercase mb-0.5">
                                    Avg Confidence
                                </p>
                                <p className="font-medium">
                                    {summary.avgConfidence
                                        ? `${summary.avgConfidence.toFixed(1)}%`
                                        : '—'}
                                </p>
                            </div>
                        </div>
                        <p className="text-[0.7rem] text-slate-400 mt-2">
                            Warnings / presumptions recorded: {summary.totalWarnings}
                        </p>
                    </div>
                )}

                {status === 'success' && report.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
                        {/* Table */}
                        <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-slate-200">
                                    File-level details
                                </p>
                                <p className="text-[0.7rem] text-slate-500">
                                    Click a row to view changes & warnings
                                </p>
                            </div>
                            <div className="max-h-80 overflow-auto rounded-lg border border-slate-800">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-900/90 text-slate-300 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">File</th>
                                            <th className="px-3 py-2 text-left font-medium">Type</th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Status
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Conf.
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Warnings
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.map((item, idx) => {
                                            const isSelected =
                                                selectedItem &&
                                                selectedItem.filePath === item.filePath;

                                            return (
                                                <tr
                                                    key={idx}
                                                    onClick={() => handleRowClick(item)}
                                                    className={`border-t border-slate-800/80 cursor-pointer hover:bg-slate-900/70 ${isSelected ? 'bg-slate-900/90' : ''
                                                        }`}
                                                >
                                                    <td className="px-3 py-2 font-mono text-[0.7rem] text-slate-100 flex items-center gap-1">
                                                        <ChevronRight
                                                            className={`h-3 w-3 transition-transform ${isSelected ? 'rotate-90' : 'rotate-0'
                                                                }`}
                                                        />
                                                        <span className="truncate max-w-[200px] md:max-w-[260px]">
                                                            {item.filePath}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-300">
                                                        {item.fileType}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {item.status === 'SUCCESS' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                                                                OK
                                                            </span>
                                                        )}
                                                        {item.status === 'FAILED' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/40">
                                                                Failed
                                                            </span>
                                                        )}
                                                        {item.status === 'PENDING' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/40">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-200">
                                                        {typeof item.confidence === 'number'
                                                            ? `${item.confidence}%`
                                                            : '—'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-200">
                                                        {item.warnings && item.warnings.length > 0 ? (
                                                            <span className="text-amber-300">
                                                                {item.warnings.length} warning(s)
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500">None</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Detail panel */}
                        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                            <p className="text-xs font-semibold text-slate-200 mb-2">
                                Changes & Warnings
                            </p>
                            {selectedItem ? (
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[0.7rem] text-slate-400 uppercase mb-1">
                                            File
                                        </p>
                                        <p className="font-mono text-xs text-slate-100">
                                            {selectedItem.filePath}
                                        </p>
                                        {selectedItem.newPath &&
                                            selectedItem.newPath !== selectedItem.filePath && (
                                                <p className="font-mono text-[0.7rem] text-slate-400 mt-1">
                                                    → {selectedItem.newPath}
                                                </p>
                                            )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <p className="text-[0.7rem] text-slate-400 uppercase mb-1">
                                                Changes Made
                                            </p>
                                            {selectedItem.changes && selectedItem.changes.length > 0 ? (
                                                <ul className="list-disc list-inside space-y-1 text-xs text-slate-100">
                                                    {selectedItem.changes.map((change, idx) => (
                                                        <li key={idx}>{change}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-slate-500">
                                                    No specific changes reported.
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[0.7rem] text-slate-400 uppercase mb-1">
                                                Warnings & Presumptions
                                            </p>
                                            {selectedItem.warnings &&
                                                selectedItem.warnings.length > 0 ? (
                                                <ul className="list-disc list-inside space-y-1 text-xs text-amber-200">
                                                    {selectedItem.warnings.map((warning, idx) => (
                                                        <li key={idx}>{warning}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-slate-500">
                                                    No warnings or presumptions for this file.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-slate-300">
                                        <div>
                                            <p className="text-slate-500 uppercase mb-0.5">
                                                Status
                                            </p>
                                            <p>
                                                {selectedItem.status === 'SUCCESS'
                                                    ? 'Converted'
                                                    : selectedItem.status === 'FAILED'
                                                        ? 'Failed'
                                                        : 'Pending'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 uppercase mb-0.5">
                                                Confidence
                                            </p>
                                            <p>
                                                {typeof selectedItem.confidence === 'number'
                                                    ? `${selectedItem.confidence}%`
                                                    : 'Not provided'}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedItem.error && (
                                        <div>
                                            <p className="text-[0.7rem] text-red-300 uppercase mb-1">
                                                Error
                                            </p>
                                            <p className="text-xs text-red-200">
                                                {selectedItem.error}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500">
                                    Select a file from the table to view changes, warnings, and
                                    presumptions.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {status === 'error' && error && (
                    <div className="mt-4 rounded-xl border border-red-500/60 bg-red-950/40 px-4 py-3 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-100">
                                Conversion failed
                            </p>
                            <p className="text-xs text-red-100/90 mt-1">{error}</p>
                        </div>
                    </div>
                )}

                <div className="pt-2 border-t border-slate-800/70 mt-4 text-[0.7rem] text-slate-500 flex flex-col">
                    <p>* Review low-confidence files and warnings before using in prod.</p>
                    <p className="hidden md:block">
                        * Conversion report includes model confidence, changes, and warnings
                        for each file.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RepoClone;
