import type { ESFProjectUrl, ESFCardInfo, CDPClient } from '../types/index.js';
/**
 * ESF Portal Navigator
 * Handles navigation and data extraction from ESF portal
 */
export declare class ESFPortal {
    private chromeUtils;
    private client;
    private currentProject;
    constructor(client: CDPClient, port: number);
    /**
     * Navigate to project page and verify access
     */
    navigateToProject(projectNumber: string): Promise<ESFProjectUrl>;
    /**
     * Discover PDF cards on the current project page
     */
    discoverPDFCards(projectNumber: string): Promise<ESFCardInfo[]>;
    /**
     * Check if user is authenticated
     */
    checkAuthentication(): Promise<boolean>;
    /**
     * Build project URL from project number
     */
    private buildProjectUrl;
    /**
     * Verify user is authenticated, throw error if not
     */
    private verifyAuthentication;
    /**
     * Verify we're on the correct project page
     */
    private verifyProjectPage;
    /**
     * Wait for page content to load
     */
    private waitForPageContent;
    /**
     * Extract card information using multiple strategies
     */
    private extractCardInfo;
    /**
     * Extract cards from participant table
     */
    private extractFromTable;
    /**
     * Extract cards from card containers
     */
    private extractFromContainers;
    /**
     * Extract participant name from filename
     */
    private extractParticipantName;
    /**
     * Get current project number
     */
    getCurrentProject(): string | null;
    /**
     * Reset current project
     */
    resetCurrentProject(): void;
    /**
     * Sleep utility
     */
    private sleep;
}
//# sourceMappingURL=ESFPortal.d.ts.map