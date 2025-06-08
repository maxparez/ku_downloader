import type { AppConfig, DownloadResult } from '../types/index.js';
import { ESFEventEmitter } from '../events/EventEmitter.js';
/**
 * Main Download Engine for ESF Downloader
 * Orchestrates the entire download process
 */
export declare class DownloadEngine extends ESFEventEmitter {
    private projectManager;
    private sessionManager;
    private fileManager;
    private esfPortal;
    private config;
    private isRunning;
    constructor(config: AppConfig);
    /**
     * Download projects from configuration
     */
    downloadProjects(projectNumbers?: string[]): Promise<DownloadResult[]>;
    /**
     * Download single project
     */
    downloadProject(projectNumber: string): Promise<DownloadResult>;
    /**
     * Ensure Chrome connection and ESF portal are ready
     */
    private ensureConnections;
    /**
     * Extract card information from project page
     */
    private extractCardInfo;
    /**
     * Download individual card
     */
    private downloadCard;
    /**
     * Prepare projects for download
     */
    private prepareProjects;
    /**
     * Connect to Chrome and ensure readiness
     */
    private connectToChrome;
    /**
     * Setup event handlers for internal components
     */
    private setupEventHandlers;
    /**
     * Create metadata for successful download
     */
    private createSuccessMetadata;
    /**
     * Create metadata for failed download
     */
    private createErrorMetadata;
    /**
     * Create empty result for projects with no cards
     */
    private createEmptyResult;
    /**
     * Utility delay function
     */
    private delay;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
    /**
     * Get current configuration
     */
    getConfig(): AppConfig;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<AppConfig>): void;
    /**
     * Check if engine is currently running
     */
    isEngineRunning(): boolean;
}
//# sourceMappingURL=DownloadEngine.d.ts.map