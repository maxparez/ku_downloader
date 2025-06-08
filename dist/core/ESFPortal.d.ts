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
    constructor(client: CDPClient, port: number);
    /**
     * Navigate to project and extract participant PDFs
     * Real workflow: ProjectsList -> Filter -> Project Detail -> Click "Podpořené osoby" tab
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
     * Navigate to projects list page
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
     * Click on "Podpořené osoby" tab to show participants
     */
    private clickSupportedPersonsTab;
    /**
     * Verify user is authenticated, throw error if not
     */
    private verifyAuthentication;
    /**
     * Extract ASP.NET ViewState and EventValidation from current page
     */
    private extractFormState;
    /**
     * Extract participants list from current page (ProjektDetailPage)
     */
    private extractParticipantsList;
    /**
     * Download PDF for a specific participant
     */
    private downloadParticipantPDF;
    /**
     * Trigger PDF download using ASP.NET postback (based on traffic analysis)
     */
    private triggerPDFDownload;
    /**
     * Generate safe filename for participant PDF
     */
    private generateFileName;
    /**
     * Sleep utility
     */
    private sleep;
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