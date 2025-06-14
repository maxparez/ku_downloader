import { AuthError, NetworkError, ValidationError } from '../types/index.js';
import { createChromeUtils } from '../utils/chrome.js';
import { logger } from '../utils/logger.js';
/**
 * ESF Portal Navigator - Updated based on Project 2799 analysis
 * Handles navigation and PDF download for participant cards
 */
export class ESFPortal2799 {
    chromeUtils;
    client;
    currentProject = null;
    constructor(client, port) {
        this.client = client;
        this.chromeUtils = createChromeUtils(client, port);
    }
    /**
     * Navigate to project and find participant cards
     * Based on project 2799 workflow analysis
     */
    async navigateToProjectCards(projectNumber) {
        try {
            this.currentProject = projectNumber;
            logger.info(`[${projectNumber}] Starting navigation to participant cards`);
            // Step 1: Navigate to project selection/search
            await this.navigateToProjectSelection();
            // Step 2: Search and select project 2799
            await this.selectProject(projectNumber);
            // Step 3: Access project info page
            await this.accessProjectInfo();
            // Step 4: Enable PDF download ("Povolit stažení PDF formuláře podpořené osoby")
            await this.enablePDFDownload();
            // Step 5: Set pagination to 50 records per page
            await this.setPagination(50);
            // Step 6: Discover participant cards
            const cards = await this.discoverParticipantCards();
            logger.info(`[${projectNumber}] Found ${cards.length} participant cards`);
            return cards;
        }
        catch (error) {
            logger.error(`[${projectNumber}] Failed to navigate to participant cards`, error);
            throw error;
        }
    }
    /**
     * Navigate to project selection page
     */
    async navigateToProjectSelection() {
        logger.debug('Navigating to project selection page');
        // Wait for ESF portal to be loaded
        const currentUrl = await this.chromeUtils.getCurrentUrl();
        if (!currentUrl.includes('esf')) {
            throw new AuthError('Not on ESF portal - please login first');
        }
        // Look for project navigation elements
        const projectsSelector = [
            'a[href*="projekty"]',
            'a[href*="projects"]',
            'a:contains("Projekty")',
            'a:contains("Moje projekty")'
        ];
        for (const selector of projectsSelector) {
            try {
                const exists = await this.chromeUtils.waitForElement(selector, 5000);
                if (exists) {
                    await this.chromeUtils.clickElement(selector);
                    logger.debug('Found and clicked projects navigation');
                    return;
                }
            }
            catch {
                continue; // Try next selector
            }
        }
        logger.warn('Could not find projects navigation - may already be on projects page');
    }
    /**
     * Search and select specific project
     */
    async selectProject(projectNumber) {
        logger.debug(`Selecting project ${projectNumber}`);
        // Wait for project listing page
        await this.chromeUtils.waitForPageLoad(10000);
        // Look for project search or direct project link
        const searchSelectors = [
            'input[type="search"]',
            'input[placeholder*="projekt"]',
            'input[name*="search"]',
            '#search',
            '.search-input'
        ];
        // Try to use search if available
        for (const selector of searchSelectors) {
            try {
                const exists = await this.chromeUtils.waitForElement(selector, 3000);
                if (exists) {
                    await this.typeText(selector, projectNumber);
                    await this.pressKey('Enter');
                    logger.debug(`Used search to find project ${projectNumber}`);
                    break;
                }
            }
            catch {
                continue;
            }
        }
        // Look for project in the list (either by number or link)
        const projectSelectors = [
            `a[href*="${projectNumber}"]`,
            `a:contains("${projectNumber}")`,
            `td:contains("${projectNumber}")`,
            `.project-${projectNumber}`,
            `[data-project="${projectNumber}"]`
        ];
        for (const selector of projectSelectors) {
            try {
                const exists = await this.chromeUtils.waitForElement(selector, 5000);
                if (exists) {
                    await this.chromeUtils.clickElement(selector);
                    logger.debug(`Found and selected project ${projectNumber}`);
                    return;
                }
            }
            catch {
                continue;
            }
        }
        throw new ValidationError(`Could not find project ${projectNumber} in the list`);
    }
    /**
     * Access project information page
     */
    async accessProjectInfo() {
        logger.debug('Accessing project information page');
        // Wait for project page to load
        await this.chromeUtils.waitForPageLoad(10000);
        // Look for participant/cards section
        const participantSelectors = [
            'a[href*="ucastn"]', // účastníci
            'a[href*="participant"]',
            'a:contains("Účastníci")',
            'a:contains("Karty")',
            'a:contains("Formuláře")',
            '.participants-link',
            '.cards-link'
        ];
        for (const selector of participantSelectors) {
            try {
                await this.chromeUtils.waitForSelector(selector, 3000);
                await this.chromeUtils.clickElement(selector);
                logger.debug('Found and clicked participants section');
                return;
            }
            catch {
                continue;
            }
        }
        logger.debug('No specific participants link found - may already be on participants page');
    }
    /**
     * Enable PDF download functionality
     * Based on "Povolit stažení PDF formuláře podpořené osoby"
     */
    async enablePDFDownload() {
        logger.debug('Enabling PDF download functionality');
        const enableSelectors = [
            'input[type="checkbox"]',
            'button:contains("Povolit")',
            'a:contains("Povolit")',
            '.enable-pdf',
            '.allow-download'
        ];
        for (const selector of enableSelectors) {
            try {
                await this.chromeUtils.waitForSelector(selector, 3000);
                // Check if it's a checkbox
                if (selector.includes('checkbox')) {
                    const isChecked = await this.chromeUtils.evaluateExpression(`document.querySelector('${selector}').checked`);
                    if (!isChecked) {
                        await this.chromeUtils.clickElement(selector);
                        logger.debug('Enabled PDF download checkbox');
                    }
                }
                else {
                    await this.chromeUtils.clickElement(selector);
                    logger.debug('Clicked PDF download enable button');
                }
                return;
            }
            catch {
                continue;
            }
        }
        logger.warn('Could not find PDF download enable option - may already be enabled');
    }
    /**
     * Set pagination to show more records per page
     */
    async setPagination(recordsPerPage = 50) {
        logger.debug(`Setting pagination to ${recordsPerPage} records per page`);
        const paginationSelectors = [
            'select[name*="page"]',
            'select[name*="limit"]',
            '.pagination-select',
            '.page-size-select'
        ];
        for (const selector of paginationSelectors) {
            try {
                await this.chromeUtils.waitForSelector(selector, 3000);
                await this.chromeUtils.selectOption(selector, recordsPerPage.toString());
                logger.debug(`Set pagination to ${recordsPerPage} records`);
                return;
            }
            catch {
                continue;
            }
        }
        logger.debug('Could not find pagination selector - using default pagination');
    }
    /**
     * Discover participant cards on the page
     */
    async discoverParticipantCards() {
        logger.debug('Discovering participant cards');
        // Wait for participant data to load
        await this.chromeUtils.waitForPageLoad(5000);
        const cards = [];
        // Look for participant table rows or card elements
        const rowSelectors = [
            'tr[data-participant]',
            'tr:has(td)',
            '.participant-row',
            '.card-row',
            'tbody tr'
        ];
        for (const selector of rowSelectors) {
            try {
                const rows = await this.chromeUtils.evaluateExpression(`
          Array.from(document.querySelectorAll('${selector}')).map((row, index) => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return null;
            
            return {
              index: index,
              name: cells[0]?.textContent?.trim() || 'Unknown',
              id: cells[1]?.textContent?.trim() || '',
              element: row.outerHTML
            };
          }).filter(item => item !== null);
        `);
                if (rows && rows.length > 0) {
                    logger.debug(`Found ${rows.length} participant rows`);
                    // Convert to ESFCardInfo format
                    for (const row of rows) {
                        cards.push({
                            participantName: row.name,
                            participantId: row.id,
                            downloadUrl: this.buildPrintToPDFUrl(row.index),
                            fileName: this.generateFileName(row.name, row.id),
                            projectNumber: this.currentProject
                        });
                    }
                    break;
                }
            }
            catch {
                continue;
            }
        }
        if (cards.length === 0) {
            throw new ValidationError('No participant cards found on the page');
        }
        return cards;
    }
    /**
     * Download participant card as PDF
     * Based on "tisk to pdf -> download pdf" mechanism
     */
    async downloadParticipantCard(cardInfo) {
        logger.debug(`Downloading card for ${cardInfo.participantName}`);
        try {
            // Navigate to participant detail
            await this.navigateToParticipantDetail(cardInfo);
            // Trigger print to PDF
            const filePath = await this.printToPDF(cardInfo);
            logger.info(`Successfully downloaded card for ${cardInfo.participantName}`);
            return filePath;
        }
        catch (error) {
            logger.error(`Failed to download card for ${cardInfo.participantName}`, error);
            throw error;
        }
    }
    /**
     * Navigate to participant detail page
     */
    async navigateToParticipantDetail(cardInfo) {
        // Look for detail link or button for this participant
        const detailSelectors = [
            `a[href*="${cardInfo.participantId}"]`,
            `button[data-id="${cardInfo.participantId}"]`,
            '.detail-link',
            '.view-participant'
        ];
        for (const selector of detailSelectors) {
            try {
                await this.chromeUtils.waitForSelector(selector, 3000);
                await this.chromeUtils.clickElement(selector);
                await this.chromeUtils.waitForPageLoad(5000);
                logger.debug(`Navigated to detail for ${cardInfo.participantName}`);
                return;
            }
            catch {
                continue;
            }
        }
        throw new ValidationError(`Could not find detail link for ${cardInfo.participantName}`);
    }
    /**
     * Print participant card to PDF
     */
    async printToPDF(cardInfo) {
        logger.debug('Triggering print to PDF');
        // Look for print button or trigger print dialog
        const printSelectors = [
            'button:contains("Tisk")',
            'a:contains("PDF")',
            '.print-button',
            '.pdf-download'
        ];
        for (const selector of printSelectors) {
            try {
                await this.chromeUtils.waitForSelector(selector, 3000);
                await this.chromeUtils.clickElement(selector);
                // Wait for download to start
                await new Promise(resolve => setTimeout(resolve, 2000));
                logger.debug('Print to PDF triggered');
                return cardInfo.fileName; // Return expected filename
            }
            catch {
                continue;
            }
        }
        // Fallback: use browser print function
        try {
            await this.chromeUtils.evaluateExpression('window.print()');
            await new Promise(resolve => setTimeout(resolve, 3000));
            logger.debug('Used browser print function');
            return cardInfo.fileName;
        }
        catch (error) {
            throw new NetworkError(`Could not trigger PDF download for ${cardInfo.participantName}`);
        }
    }
    /**
     * Build print to PDF URL based on row index
     */
    buildPrintToPDFUrl(rowIndex) {
        const baseUrl = this.chromeUtils.getCurrentUrl();
        return `${baseUrl}?action=print&participant=${rowIndex}`;
    }
    /**
     * Generate filename for participant card
     */
    generateFileName(participantName, participantId) {
        const safeName = participantName.replace(/[^a-zA-Z0-9]/g, '_');
        const safeId = participantId.replace(/[^a-zA-Z0-9]/g, '_');
        return `karta_${safeName}_${safeId}_${this.currentProject}.pdf`;
    }
    /**
     * Type text into input field
     */
    async typeText(selector, text) {
        try {
            const result = await this.client.send('Runtime.evaluate', {
                expression: `
          const element = document.querySelector('${selector}');
          if (element) {
            element.value = '${text}';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            true;
          } else {
            false;
          }
        `,
                returnByValue: true
            });
            return result.result.value === true;
        }
        catch {
            return false;
        }
    }
    /**
     * Press key
     */
    async pressKey(key) {
        try {
            await this.client.send('Runtime.evaluate', {
                expression: `
          const event = new KeyboardEvent('keydown', { key: '${key}' });
          document.dispatchEvent(event);
        `
            });
        }
        catch {
            // Ignore errors
        }
    }
    /**
     * Select option in select element
     */
    async selectOption(selector, value) {
        try {
            const result = await this.client.send('Runtime.evaluate', {
                expression: `
          const select = document.querySelector('${selector}');
          if (select) {
            select.value = '${value}';
            select.dispatchEvent(new Event('change', { bubbles: true }));
            true;
          } else {
            false;
          }
        `,
                returnByValue: true
            });
            return result.result.value === true;
        }
        catch {
            return false;
        }
    }
    /**
     * Return to projects list
     */
    async returnToProjectsList() {
        logger.debug('Returning to projects list');
        const backSelectors = [
            'a:contains("Zpět")',
            'a:contains("Projekty")',
            'button:contains("Zpět")',
            '.back-button',
            '.return-link'
        ];
        for (const selector of backSelectors) {
            try {
                await this.chromeUtils.waitForSelector(selector, 3000);
                await this.chromeUtils.clickElement(selector);
                await this.chromeUtils.waitForPageLoad(5000);
                logger.debug('Returned to projects list');
                return;
            }
            catch {
                continue;
            }
        }
        logger.warn('Could not find return link - using browser back');
        await this.chromeUtils.goBack();
    }
}
//# sourceMappingURL=ESFPortal-2799.js.map