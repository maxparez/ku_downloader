import { AuthError, NetworkError, ValidationError } from '../types/index.js';
import { ESF_CONFIG } from '../config/defaults.js';
import { createChromeUtils } from '../utils/chrome.js';
import { logger } from '../utils/logger.js';
/**
 * ESF Portal Navigator
 * Handles navigation and data extraction from ESF portal
 */
export class ESFPortal {
    chromeUtils;
    client;
    currentProject = null;
    constructor(client, port) {
        this.client = client;
        this.chromeUtils = createChromeUtils(client, port);
    }
    /**
     * Navigate to project page and verify access
     */
    async navigateToProject(projectNumber) {
        try {
            this.currentProject = projectNumber;
            const projectUrl = this.buildProjectUrl(projectNumber);
            logger.debug(`[${projectNumber}] Navigating to project page`);
            // Navigate to project page
            await this.chromeUtils.navigateAndWait(projectUrl.fullUrl, 30000);
            // Check authentication status
            await this.verifyAuthentication();
            // Verify we're on the correct project page
            await this.verifyProjectPage(projectNumber);
            logger.debug(`[${projectNumber}] Successfully navigated to project page`);
            return projectUrl;
        }
        catch (error) {
            if (error instanceof AuthError || error instanceof NetworkError) {
                throw error;
            }
            throw new NetworkError(`Failed to navigate to project ${projectNumber}`, projectNumber, error);
        }
    }
    /**
     * Discover PDF cards on the current project page
     */
    async discoverPDFCards(projectNumber) {
        try {
            logger.debug(`[${projectNumber}] Discovering PDF cards`);
            // Wait for page to load completely
            await this.waitForPageContent();
            // Try multiple strategies to find PDF cards
            const cards = await this.extractCardInfo(projectNumber);
            if (cards.length === 0) {
                logger.warn(`[${projectNumber}] No PDF cards found on page`);
            }
            else {
                logger.debug(`[${projectNumber}] Found ${cards.length} PDF cards`);
            }
            return cards;
        }
        catch (error) {
            throw new NetworkError(`Failed to discover PDF cards for project ${projectNumber}`, projectNumber, error);
        }
    }
    /**
     * Check if user is authenticated
     */
    async checkAuthentication() {
        try {
            const currentUrl = await this.chromeUtils.getCurrentUrl();
            const title = await this.chromeUtils.getPageTitle();
            // Check for identity.gov.cz redirect
            if (currentUrl.includes('identita.gov.cz')) {
                logger.debug('Detected identita.gov.cz - authentication required');
                return false;
            }
            // Check for login indicators
            if (currentUrl.includes('login') ||
                title.toLowerCase().includes('přihlášení') ||
                title.toLowerCase().includes('login')) {
                logger.debug('Detected login page - authentication required');
                return false;
            }
            // Check for ESF portal access
            if (currentUrl.includes('esf.gov.cz') &&
                !currentUrl.includes('login') &&
                !title.toLowerCase().includes('error')) {
                logger.debug('User appears to be authenticated to ESF portal');
                return true;
            }
            return false;
        }
        catch (error) {
            logger.debug('Failed to check authentication status', undefined, { error: error.message });
            return false;
        }
    }
    /**
     * Build project URL from project number
     */
    buildProjectUrl(projectNumber) {
        // Normalize project number to 7 digits with leading zeros
        const normalizedNumber = projectNumber.padStart(7, '0');
        const projectPath = ESF_CONFIG.PROJECT_PATH_TEMPLATE.replace('{projectNumber}', normalizedNumber);
        const fullUrl = ESF_CONFIG.BASE_URL + projectPath;
        return {
            baseUrl: ESF_CONFIG.BASE_URL,
            projectPath,
            fullUrl
        };
    }
    /**
     * Verify user is authenticated, throw error if not
     */
    async verifyAuthentication() {
        const isAuthenticated = await this.checkAuthentication();
        if (!isAuthenticated) {
            throw new AuthError('User authentication required. Please login manually to identita.gov.cz');
        }
    }
    /**
     * Verify we're on the correct project page
     */
    async verifyProjectPage(projectNumber) {
        const currentUrl = await this.chromeUtils.getCurrentUrl();
        const title = await this.chromeUtils.getPageTitle();
        // Check if we're on an error page
        if (title.toLowerCase().includes('error') ||
            title.toLowerCase().includes('nenalezen') ||
            currentUrl.includes('error')) {
            throw new ValidationError(`Project ${projectNumber} not found or not accessible`);
        }
        // Check if URL contains project number
        if (!currentUrl.includes(projectNumber.padStart(7, '0'))) {
            logger.warn(`[${projectNumber}] URL doesn't contain expected project number`);
        }
        logger.debug(`[${projectNumber}] Project page verified`, undefined, { url: currentUrl, title });
    }
    /**
     * Wait for page content to load
     */
    async waitForPageContent() {
        // Wait for common ESF portal elements
        const selectors = [
            '.content',
            '.main-content',
            '#content',
            '.project-content',
            '.participants',
            'table',
            '.card-list'
        ];
        for (const selector of selectors) {
            const found = await this.chromeUtils.waitForElement(selector, 5000);
            if (found) {
                logger.debug(`Page content loaded: ${selector}`);
                break;
            }
        }
        // Additional wait for dynamic content
        await this.sleep(2000);
    }
    /**
     * Extract card information using multiple strategies
     */
    async extractCardInfo(projectNumber) {
        const cards = [];
        try {
            // Strategy 1: Look for direct PDF links
            const pdfLinks = await this.chromeUtils.extractPDFLinks();
            for (const link of pdfLinks) {
                cards.push({
                    cardNumber: cards.length + 1,
                    fileName: link.filename,
                    downloadUrl: link.url,
                    participantName: this.extractParticipantName(link.filename)
                });
            }
            // Strategy 2: Look for participant tables with download links
            const tableCards = await this.extractFromTable();
            cards.push(...tableCards);
            // Strategy 3: Look for card containers
            const containerCards = await this.extractFromContainers();
            cards.push(...containerCards);
            // Remove duplicates based on URL
            const uniqueCards = cards.filter((card, index, arr) => arr.findIndex(c => c.downloadUrl === card.downloadUrl) === index);
            // Renumber cards
            uniqueCards.forEach((card, index) => {
                card.cardNumber = index + 1;
            });
            return uniqueCards;
        }
        catch (error) {
            logger.debug(`[${projectNumber}] Error extracting card info`, undefined, { error: error.message });
            return cards;
        }
    }
    /**
     * Extract cards from participant table
     */
    async extractFromTable() {
        try {
            const tableData = await this.chromeUtils.injectScript(`
        const cards = [];
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach((row, index) => {
            if (index === 0) return; // Skip header
            
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;
            
            // Look for download links in the row
            const downloadLinks = row.querySelectorAll('a[href*="download"], a[href*=".pdf"], a[href*="soubor"]');
            
            downloadLinks.forEach(link => {
              const participantName = cells[0]?.textContent?.trim() || '';
              const url = link.href;
              const filename = link.textContent.trim() || participantName + '.pdf';
              
              if (url && !url.includes('javascript:')) {
                cards.push({
                  cardNumber: cards.length + 1,
                  fileName: filename,
                  downloadUrl: url,
                  participantName: participantName
                });
              }
            });
          });
        });
        
        return cards;
      `);
            return tableData || [];
        }
        catch (error) {
            logger.debug('Failed to extract cards from table', undefined, { error: error.message });
            return [];
        }
    }
    /**
     * Extract cards from card containers
     */
    async extractFromContainers() {
        try {
            const containerData = await this.chromeUtils.injectScript(`
        const cards = [];
        const containers = document.querySelectorAll('.card, .participant-card, .download-item');
        
        containers.forEach(container => {
          const nameElement = container.querySelector('.name, .participant-name, h3, strong');
          const linkElement = container.querySelector('a[href*="download"], a[href*=".pdf"]');
          
          if (linkElement) {
            const participantName = nameElement?.textContent?.trim() || '';
            const url = linkElement.href;
            const filename = linkElement.textContent.trim() || participantName + '.pdf';
            
            if (url && !url.includes('javascript:')) {
              cards.push({
                cardNumber: cards.length + 1,
                fileName: filename,
                downloadUrl: url,
                participantName: participantName
              });
            }
          }
        });
        
        return cards;
      `);
            return containerData || [];
        }
        catch (error) {
            logger.debug('Failed to extract cards from containers', undefined, { error: error.message });
            return [];
        }
    }
    /**
     * Extract participant name from filename
     */
    extractParticipantName(filename) {
        // Remove file extension
        const nameWithoutExt = filename.replace(/\.pdf$/i, '');
        // Basic cleanup
        const cleaned = nameWithoutExt
            .replace(/[_-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned || undefined;
    }
    /**
     * Get current project number
     */
    getCurrentProject() {
        return this.currentProject;
    }
    /**
     * Reset current project
     */
    resetCurrentProject() {
        this.currentProject = null;
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=ESFPortal.js.map