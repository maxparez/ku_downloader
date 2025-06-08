import { NetworkError, ValidationError } from '../types/index.js';
import { createChromeUtils } from '../utils/chrome.js';
import { logger } from '../utils/logger.js';
/**
 * ESF Portal Navigator - Simplified version for testing
 * Based on real workflow: esf2014.esfcr.cz project analysis
 */
export class ESFPortalSimple {
    chromeUtils;
    client;
    constructor(client, port) {
        this.client = client;
        this.chromeUtils = createChromeUtils(client, port);
    }
    /**
     * Verify we're on correct ESF page
     */
    async verifyESFPortal() {
        try {
            const url = await this.chromeUtils.getCurrentUrl();
            const title = await this.chromeUtils.getPageTitle();
            logger.debug(`Current URL: ${url}`);
            logger.debug(`Page title: ${title}`);
            return url.includes('esf2014.esfcr.cz') || url.includes('esfcr.cz');
        }
        catch (error) {
            logger.error('Failed to verify ESF portal', error);
            return false;
        }
    }
    /**
     * Navigate to projects list page
     */
    async navigateToProjectsList() {
        const projectsUrl = 'https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/ProjektSeznamPage.aspx?action=getMy';
        try {
            logger.info('Navigating to projects list page');
            await this.chromeUtils.navigateAndWait(projectsUrl, 30000);
            // Verify we're on the correct page
            const url = await this.chromeUtils.getCurrentUrl();
            if (!url.includes('ProjektSeznamPage')) {
                throw new NetworkError('Failed to reach projects list page');
            }
            logger.info('Successfully navigated to projects list');
        }
        catch (error) {
            logger.error('Failed to navigate to projects list', error);
            throw error;
        }
    }
    /**
     * Search for specific project
     */
    async searchProject(projectNumber) {
        try {
            logger.info(`Searching for project ${projectNumber}`);
            // Wait for page to load
            await this.chromeUtils.waitForPageLoad(5000);
            // Try to find search input
            const searchResult = await this.client.send('Runtime.evaluate', {
                expression: `
          // Look for search/filter inputs
          const inputs = document.querySelectorAll('input[type="text"], input[type="search"]');
          let searchInput = null;
          
          for (let input of inputs) {
            if (input.placeholder && input.placeholder.toLowerCase().includes('projekt') ||
                input.name && input.name.toLowerCase().includes('search') ||
                input.id && input.id.toLowerCase().includes('search')) {
              searchInput = input;
              break;
            }
          }
          
          if (searchInput) {
            searchInput.value = '${projectNumber}';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          
          return false;
        `,
                returnByValue: true
            });
            if (searchResult.result.value) {
                logger.debug('Project search input filled');
                return true;
            }
            logger.warn('No search input found - will browse list manually');
            return false;
        }
        catch (error) {
            logger.error(`Failed to search project ${projectNumber}`, error);
            return false;
        }
    }
    /**
     * Find and click project in the list
     */
    async selectProject(projectNumber) {
        try {
            logger.info(`Selecting project ${projectNumber}`);
            const selectResult = await this.client.send('Runtime.evaluate', {
                expression: `
          // Look for project links or buttons
          const links = document.querySelectorAll('a, button, td');
          let projectElement = null;
          
          for (let element of links) {
            const text = element.textContent || '';
            const href = element.href || '';
            
            if (text.includes('${projectNumber}') || href.includes('${projectNumber}')) {
              projectElement = element;
              break;
            }
          }
          
          if (projectElement) {
            projectElement.click();
            return true;
          }
          
          return false;
        `,
                returnByValue: true
            });
            if (selectResult.result.value) {
                logger.info(`Successfully selected project ${projectNumber}`);
                await this.chromeUtils.waitForPageLoad(10000);
                return true;
            }
            throw new ValidationError(`Project ${projectNumber} not found in the list`);
        }
        catch (error) {
            logger.error(`Failed to select project ${projectNumber}`, error);
            throw error;
        }
    }
    /**
     * Navigate to supported persons (Podpořené osoby)
     */
    async navigateToSupportedPersons() {
        try {
            logger.info('Navigating to supported persons section');
            const navResult = await this.client.send('Runtime.evaluate', {
                expression: `
          // Look for "Podpořené osoby" link
          const links = document.querySelectorAll('a, button');
          let supportedPersonsLink = null;
          
          for (let link of links) {
            const text = link.textContent || '';
            if (text.includes('Podpořené osoby') || 
                text.includes('Účastníci') ||
                text.includes('Osoby')) {
              supportedPersonsLink = link;
              break;
            }
          }
          
          if (supportedPersonsLink) {
            supportedPersonsLink.click();
            return true;
          }
          
          return false;
        `,
                returnByValue: true
            });
            if (navResult.result.value) {
                logger.info('Successfully navigated to supported persons');
                await this.chromeUtils.waitForPageLoad(10000);
                return true;
            }
            logger.warn('Could not find supported persons link');
            return false;
        }
        catch (error) {
            logger.error('Failed to navigate to supported persons', error);
            return false;
        }
    }
    /**
     * Get list of persons with download links
     */
    async getPersonsList() {
        try {
            logger.info('Getting list of persons');
            const personsResult = await this.client.send('Runtime.evaluate', {
                expression: `
          const persons = [];
          const rows = document.querySelectorAll('tr, .person-row, .participant-row');
          
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td, .cell, .name');
            
            if (cells.length >= 1) {
              const nameElement = cells[0];
              const name = nameElement.textContent ? nameElement.textContent.trim() : '';
              
              if (name && name.length > 2) {
                // Look for detail link in this row
                const detailLink = row.querySelector('a[href*="detail"], a[href*="osoba"], button');
                
                persons.push({
                  name: name,
                  id: i.toString(),
                  hasDetailLink: !!detailLink,
                  rowIndex: i
                });
              }
            }
          }
          
          return persons;
        `,
                returnByValue: true
            });
            const persons = personsResult.result.value || [];
            logger.info(`Found ${persons.length} persons`);
            // Convert to ESFCardInfo format
            return persons.map((person) => ({
                participantName: person.name,
                participantId: person.id,
                downloadUrl: '', // Will be filled when downloading
                fileName: this.generateFileName(person.name, person.id),
                projectNumber: 'current' // Will be set by caller
            }));
        }
        catch (error) {
            logger.error('Failed to get persons list', error);
            return [];
        }
    }
    /**
     * Download PDF for specific person
     */
    async downloadPersonPDF(person, rowIndex) {
        try {
            logger.info(`Downloading PDF for ${person.participantName}`);
            // Click on person detail
            const detailResult = await this.client.send('Runtime.evaluate', {
                expression: `
          const rows = document.querySelectorAll('tr, .person-row');
          const targetRow = rows[${rowIndex}];
          
          if (targetRow) {
            const detailLink = targetRow.querySelector('a, button');
            if (detailLink) {
              detailLink.click();
              return true;
            }
          }
          
          return false;
        `,
                returnByValue: true
            });
            if (!detailResult.result.value) {
                throw new Error('Could not click person detail');
            }
            // Wait for detail page to load
            await this.chromeUtils.waitForPageLoad(5000);
            // Look for PDF download button
            const downloadResult = await this.client.send('Runtime.evaluate', {
                expression: `
          const buttons = document.querySelectorAll('a, button, input[type="button"]');
          let downloadButton = null;
          
          for (let button of buttons) {
            const text = button.textContent || button.value || '';
            if (text.includes('PDF') || 
                text.includes('Stáhnout') ||
                text.includes('Download') ||
                text.includes('Tisk')) {
              downloadButton = button;
              break;
            }
          }
          
          if (downloadButton) {
            downloadButton.click();
            return true;
          }
          
          return false;
        `,
                returnByValue: true
            });
            if (downloadResult.result.value) {
                logger.info(`PDF download triggered for ${person.participantName}`);
                // Wait for download to start
                await new Promise(resolve => setTimeout(resolve, 3000));
                return true;
            }
            throw new Error('Could not find PDF download button');
        }
        catch (error) {
            logger.error(`Failed to download PDF for ${person.participantName}`, error);
            return false;
        }
    }
    /**
     * Generate safe filename
     */
    generateFileName(name, id) {
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
        const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
        return `osoba_${safeName}_${safeId}.pdf`;
    }
    /**
     * Go back to previous page
     */
    async goBack() {
        try {
            await this.client.send('Runtime.evaluate', {
                expression: 'window.history.back();'
            });
            await this.chromeUtils.waitForPageLoad(5000);
            logger.debug('Navigated back');
        }
        catch (error) {
            logger.error('Failed to go back', error);
        }
    }
}
//# sourceMappingURL=ESFPortal-Simple.js.map