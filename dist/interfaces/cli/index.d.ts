#!/usr/bin/env node
/**
 * CLI Entry Point for ESF Downloader
 * Thin wrapper around core DownloadEngine with CLI-specific UI
 */
declare class ESFDownloaderCLI {
    private argumentParser;
    private progressDisplay;
    private downloadEngine;
    private config;
    constructor();
    /**
     * Main CLI entry point
     */
    run(argv?: string[]): Promise<void>;
    /**
     * Merge CLI arguments with default configuration
     */
    private mergeConfigWithArgs;
    /**
     * Validate environment before starting download
     */
    private validateEnvironment;
    /**
     * Test Chrome connection
     */
    private testChromeConnection;
    /**
     * Validate output directory
     */
    private validateOutputDirectory;
    /**
     * Setup event listeners for real-time UI updates
     */
    private setupEventListeners;
    /**
     * Handle errors with appropriate CLI display
     */
    private handleError;
}
export { ESFDownloaderCLI };
//# sourceMappingURL=index.d.ts.map