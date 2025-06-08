import type { ESFProjectUrl, ESFCardInfo, CDPClient } from '../types/index.js';
/**
 * ESF Portal Navigator - Real Implementation
 * Based on traffic analysis of esf2014.esfcr.cz
 * Handles ASP.NET ViewState, form submissions, and PDF downloads
 */
export declare class ESFPortal {
    private chromeUtils;
    private client;
    private currentProject;
    private viewState;
    private eventValidation;
    private progressCallback?;
    constructor(client: CDPClient, port: number);
    /**
     * Navigate to project and extract participant PDFs
     * Optimized workflow: ProjectsList -> Filter -> Project Detail -> Check PDF permission -> Click "Podpořené osoby" tab
     */
    navigateToProject(projectNumber: string): Promise<ESFProjectUrl>;
    /**
     * Discover and download PDF cards for participants
     */
    discoverPDFCards(projectNumber: string): Promise<ESFCardInfo[]>;
    /**
     * Check if user is authenticated to ESF portal
     */
    checkAuthentication(): Promise<boolean>;
    /**
     * Navigate to projects list page and check authentication
     */
    private navigateToProjectsList;
    /**
     * Filter projects by project number using DevExpress grid
     */
    private filterByProjectNumber;
    /**
     * Trigger project filter using ASP.NET postback
     */
    private triggerProjectFilter;
    /**
     * Navigate to project detail page
     */
    private navigateToProjectDetail;
    /**
     * Ensure PDF download permission checkbox is checked and save changes
     */
    private ensurePDFDownloadPermission;
    /**
     * Click on "Podpořené osoby" tab to show participants
     */
    private clickSupportedPersonsTab;
    /**
     * Set page size to 50 to show more participants
     */
    private setPageSizeTo50;
    /**
     * Extract ASP.NET ViewState and EventValidation from current page
     */
    private extractFormState;
    /**
     * Extract participants list from current page (ProjektDetailPage)
     */
    private extractParticipantsList;
    /**
     * Download PDF for a specific participant using optimized direct navigation
     */
    private downloadParticipantPDF;
    /**
     * Generate safe filename for participant PDF
     */
    private generateFileName;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Set progress callback for download tracking
     */
    setProgressCallback(callback: (progress: {
        current: number;
        total: number;
        participant: string;
        downloaded: number;
    }) => void): void;
    /**
     * Get current project number
     */
    getCurrentProject(): string | null;
    /**
     * Reset current project
     */
    resetCurrentProject(): void;
}
//# sourceMappingURL=ESFPortal.d.ts.map