import type { ProgressEvent, ErrorEvent, StatusEvent, AppConfig } from '../../types/index.js';
/**
 * CLI progress display for ESF Downloader
 * Handles real-time progress updates and status information
 */
export declare class CLIProgressDisplay {
    private config;
    private startTime;
    private completedProjects;
    private totalProjects;
    private currentProject;
    private projectStartTime;
    constructor(config: AppConfig);
    /**
     * Initialize progress tracking
     */
    initialize(totalProjects: number): void;
    /**
     * Handle progress events from the core engine
     */
    onProgress(event: ProgressEvent): void;
    /**
     * Handle error events from the core engine
     */
    onError(event: ErrorEvent): void;
    /**
     * Handle status events from the core engine
     */
    onStatus(event: StatusEvent): void;
    /**
     * Handle project start
     */
    private handleProjectStart;
    /**
     * Handle download progress
     */
    private handleDownloadProgress;
    /**
     * Handle project completion
     */
    private handleProjectComplete;
    /**
     * Display final summary
     */
    displaySummary(results: any[]): void;
    /**
     * Display error summary
     */
    displayError(error: Error): void;
    /**
     * Create ASCII progress bar
     */
    private createProgressBar;
    /**
     * Format duration in human-readable format
     */
    private formatDuration;
    /**
     * Get error prefix based on error type
     */
    private getErrorPrefix;
    /**
     * Get status prefix based on status type
     */
    private getStatusPrefix;
    /**
     * Get status icon based on status
     */
    private getStatusIcon;
    /**
     * Clear current line (for progress updates)
     */
    private clearLine;
}
//# sourceMappingURL=progress.d.ts.map