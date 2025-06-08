import type { ESFCardInfo, CDPClient } from '../types/index.js';
/**
 * ESF Portal Navigator - Updated based on Project 2799 analysis
 * Handles navigation and PDF download for participant cards
 */
export declare class ESFPortal2799 {
    private chromeUtils;
    private client;
    private currentProject;
    constructor(client: CDPClient, port: number);
    /**
     * Navigate to project and find participant cards
     * Based on project 2799 workflow analysis
     */
    navigateToProjectCards(projectNumber: string): Promise<ESFCardInfo[]>;
    /**
     * Navigate to project selection page
     */
    private navigateToProjectSelection;
    /**
     * Search and select specific project
     */
    private selectProject;
    /**
     * Access project information page
     */
    private accessProjectInfo;
    /**
     * Enable PDF download functionality
     * Based on "Povolit stažení PDF formuláře podpořené osoby"
     */
    private enablePDFDownload;
    /**
     * Set pagination to show more records per page
     */
    private setPagination;
    /**
     * Discover participant cards on the page
     */
    private discoverParticipantCards;
    /**
     * Download participant card as PDF
     * Based on "tisk to pdf -> download pdf" mechanism
     */
    downloadParticipantCard(cardInfo: ESFCardInfo): Promise<string>;
    /**
     * Navigate to participant detail page
     */
    private navigateToParticipantDetail;
    /**
     * Print participant card to PDF
     */
    private printToPDF;
    /**
     * Build print to PDF URL based on row index
     */
    private buildPrintToPDFUrl;
    /**
     * Generate filename for participant card
     */
    private generateFileName;
    /**
     * Type text into input field
     */
    private typeText;
    /**
     * Press key
     */
    private pressKey;
    /**
     * Select option in select element
     */
    private selectOption;
    /**
     * Return to projects list
     */
    returnToProjectsList(): Promise<void>;
}
//# sourceMappingURL=ESFPortal-2799.d.ts.map