import type { ESFCardInfo, CDPClient } from '../types/index.js';
/**
 * ESF Portal Navigator - Simplified version for testing
 * Based on real workflow: esf2014.esfcr.cz project analysis
 */
export declare class ESFPortalSimple {
    private chromeUtils;
    private client;
    constructor(client: CDPClient, port: number);
    /**
     * Verify we're on correct ESF page
     */
    verifyESFPortal(): Promise<boolean>;
    /**
     * Navigate to projects list page
     */
    navigateToProjectsList(): Promise<void>;
    /**
     * Search for specific project
     */
    searchProject(projectNumber: string): Promise<boolean>;
    /**
     * Find and click project in the list
     */
    selectProject(projectNumber: string): Promise<boolean>;
    /**
     * Navigate to supported persons (Podpořené osoby)
     */
    navigateToSupportedPersons(): Promise<boolean>;
    /**
     * Get list of persons with download links
     */
    getPersonsList(): Promise<ESFCardInfo[]>;
    /**
     * Download PDF for specific person
     */
    downloadPersonPDF(person: ESFCardInfo, rowIndex: number): Promise<boolean>;
    /**
     * Generate safe filename
     */
    private generateFileName;
    /**
     * Go back to previous page
     */
    goBack(): Promise<void>;
}
//# sourceMappingURL=ESFPortal-Simple.d.ts.map