#!/usr/bin/env node
/**
 * ESF Portal Analyzer CLI
 * Interactive tool for recording manual workflow through ESF portal
 */
declare class ESFAnalyzer {
    private sessionManager;
    private analyzer;
    private projectNumber;
    constructor();
    /**
     * Main analyzer entry point
     */
    run(): Promise<void>;
    /**
     * Show interactive command menu
     */
    private showInteractiveMenu;
    /**
     * Handle interactive commands
     */
    private handleCommand;
    /**
     * Start recording network traffic
     */
    private startRecording;
    /**
     * Stop recording and save data
     */
    private stopRecording;
    /**
     * Add manual marker
     */
    private addMarker;
    /**
     * Show current status
     */
    private showStatus;
    /**
     * Show help
     */
    private showHelp;
    /**
     * Cleanup resources
     */
    private cleanup;
}
export { ESFAnalyzer };
//# sourceMappingURL=analyzer.d.ts.map