import { AuthError, NetworkError } from '../types/index.js';
import { createChromeUtils } from '../utils/chrome.js';
import { logger } from '../utils/logger.js';
/**
 * ESF Portal Navigator - Real Implementation
 * Based on traffic analysis of esf2014.esfcr.cz
 * Handles ASP.NET ViewState, form submissions, and PDF downloads
 */
export class ESFPortal {
    chromeUtils;
    client;
    currentProject = null;
    viewState = null;
    eventValidation = null;
    progressCallback;
    constructor(client, port) {
        this.client = client;
        this.chromeUtils = createChromeUtils(client, port);
    }
    /**
     * Navigate to project and extract participant PDFs
     * Optimized workflow: ProjectsList -> Filter -> Project Detail -> Check PDF permission -> Click "Podpořené osoby" tab
     */
    async navigateToProject(projectNumber) {
        try {
            this.currentProject = projectNumber;
            logger.info(`[${projectNumber}] Starting ESF portal navigation`);
            // Step 1: Navigate to projects list
            await this.navigateToProjectsList();
            // Step 2: Filter by project number (if not already filtered)
            await this.filterByProjectNumber(projectNumber);
            // Step 3: Navigate to project detail
            const projectId = await this.navigateToProjectDetail(projectNumber);
            // Step 4: Ensure PDF download permission is enabled
            await this.ensurePDFDownloadPermission();
            // Step 5: Click on "Podpořené osoby" tab to show participants
            await this.clickSupportedPersonsTab();
            // Step 6: Set page size to 50 for more participants
            await this.setPageSizeTo50();
            logger.info(`[${projectNumber}] Successfully navigated to participants tab`);
            return {
                baseUrl: 'https://esf2014.esfcr.cz',
                projectPath: `/PublicPortal/Views/Projekty/ProjektDetailPage.aspx?projektId=${projectId}`,
                fullUrl: `https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/ProjektDetailPage.aspx?action=get&projektId=${projectId}`
            };
        }
        catch (error) {
            if (error instanceof AuthError || error instanceof NetworkError) {
                throw error;
            }
            throw new NetworkError(`Failed to navigate to project ${projectNumber}`, projectNumber, error);
        }
    }
    /**
     * Discover and download PDF cards for participants
     */
    async discoverPDFCards(projectNumber) {
        try {
            logger.info(`[${projectNumber}] Discovering participant PDF cards`);
            // Extract participants list with full URLs
            const participants = await this.extractParticipantsList();
            if (participants.length === 0) {
                logger.warn(`[${projectNumber}] No participants found`);
                return [];
            }
            logger.info(`[${projectNumber}] Found ${participants.length} participants`);
            // Download PDFs for each participant using optimized workflow
            const cards = [];
            let downloadedCount = 0;
            for (let i = 0; i < participants.length; i++) {
                const participant = participants[i];
                try {
                    logger.info(`[${projectNumber}] Processing participant ${i + 1}/${participants.length}: ${participant.name}`);
                    const pdfCard = await this.downloadParticipantPDF(participant, projectNumber);
                    if (pdfCard) {
                        cards.push(pdfCard);
                        downloadedCount++;
                        logger.info(`[${projectNumber}] Downloaded PDF ${downloadedCount} for ${participant.name}`);
                    }
                    // Emit progress event
                    if (this.progressCallback) {
                        this.progressCallback({
                            current: i + 1,
                            total: participants.length,
                            participant: participant.name,
                            downloaded: downloadedCount
                        });
                    }
                }
                catch (error) {
                    logger.error(`Failed to download PDF for ${participant.name}`, error);
                }
            }
            logger.info(`[${projectNumber}] Successfully downloaded ${cards.length} PDFs out of ${participants.length} participants`);
            return cards;
        }
        catch (error) {
            throw new NetworkError(`Failed to discover PDF cards for project ${projectNumber}`, projectNumber, error);
        }
    }
    /**
     * Check if user is authenticated to ESF portal
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
            // Check for ESF portal access (esf2014.esfcr.cz)
            if (currentUrl.includes('esf2014.esfcr.cz') &&
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
     * Navigate to projects list page and check authentication
     */
    async navigateToProjectsList() {
        const projectsUrl = 'https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/ProjektSeznamPage.aspx?action=getMy';
        try {
            logger.debug('Navigating to projects list page');
            await this.chromeUtils.navigateAndWait(projectsUrl, 30000);
            // Check if we were redirected to login page
            const currentUrl = await this.chromeUtils.getCurrentUrl();
            const title = await this.chromeUtils.getPageTitle();
            if (currentUrl.includes('identita.gov.cz') ||
                currentUrl.includes('login') ||
                title.toLowerCase().includes('přihlášení') ||
                title.toLowerCase().includes('login')) {
                logger.info('User is not authenticated to ESF portal');
                throw new AuthError(`
🔐 PŘIHLÁŠENÍ VYŽADOVÁNO

Nejste přihlášeni k ESF portálu. Prosím:

1. Otevřete Chrome a přihlaste se přes portal občana na:
   https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/ProjektSeznamPage.aspx?action=getMy

2. Po přihlášení nechte Chrome otevřený a spusťte znovu:
   npm run download -- --projects ${this.currentProject} --verbose

3. Nebo použijte Chrome v debug módu:
   google-chrome --remote-debugging-port=9222 --no-sandbox
   
Poznámka: Přihlášení přes identita.gov.cz musí být provedeno manuálně.`);
            }
            // If we're here, user is authenticated - extract form state
            await this.extractFormState();
            logger.debug('Successfully loaded projects list page - user authenticated');
        }
        catch (error) {
            if (error instanceof AuthError) {
                throw error; // Re-throw authentication errors
            }
            throw new NetworkError('Failed to navigate to projects list', '', error);
        }
    }
    /**
     * Filter projects by project number using DevExpress grid
     */
    async filterByProjectNumber(projectNumber) {
        try {
            logger.debug(`Filtering projects by number: ${projectNumber}`);
            // Fill the filter field (based on traffic analysis)
            const filterResult = await this.client.send('Runtime.evaluate', {
                expression: `
          // Find the project number filter field
          const filterInput = document.querySelector('input[name*="DXFREditorcol1"], input[id*="DXFREditorcol1"]');
          if (filterInput) {
            filterInput.value = '${projectNumber}';
            filterInput.dispatchEvent(new Event('input', { bubbles: true }));
            filterInput.dispatchEvent(new Event('change', { bubbles: true }));
            true;
          } else {
            false;
          }
        `,
                returnByValue: true
            });
            if (!filterResult.result.value) {
                throw new Error('Could not find project filter input');
            }
            // Wait for filter to apply
            await this.sleep(2000);
            // Trigger the filter (based on POST data from traffic analysis)
            await this.triggerProjectFilter(projectNumber);
            logger.debug(`Project filter applied for: ${projectNumber}`);
        }
        catch (error) {
            throw new NetworkError(`Failed to filter by project ${projectNumber}`, projectNumber, error);
        }
    }
    /**
     * Trigger project filter using ASP.NET postback
     */
    async triggerProjectFilter(projectNumber) {
        if (!this.viewState || !this.eventValidation) {
            throw new Error('Missing ViewState or EventValidation');
        }
        // Based on the traffic analysis, trigger filter with __EVENTTARGET
        const triggerResult = await this.client.send('Runtime.evaluate', {
            expression: `
        // Submit the form with proper ASP.NET postback
        const form = document.forms[0];
        if (form) {
          const eventTarget = document.createElement('input');
          eventTarget.type = 'hidden';
          eventTarget.name = '__EVENTTARGET';
          eventTarget.value = 'ctl00$ctl00$ProjektInfos';
          form.appendChild(eventTarget);
          
          const eventArgument = document.createElement('input');
          eventArgument.type = 'hidden';
          eventArgument.name = '__EVENTARGUMENT';
          eventArgument.value = '17|APPLYCOLUMNFILTER1|14|${projectNumber}';
          form.appendChild(eventArgument);
          
          form.submit();
          true;
        } else {
          false;
        }
      `,
            returnByValue: true
        });
        if (!triggerResult.result.value) {
            throw new Error('Could not submit filter form');
        }
        // Wait for page reload
        await this.chromeUtils.waitForPageLoad(10000);
        // Extract new form state
        await this.extractFormState();
    }
    /**
     * Navigate to project detail page
     */
    async navigateToProjectDetail(projectNumber) {
        try {
            logger.debug(`Navigating to project detail for: ${projectNumber}`);
            // Find and click project link (based on step-by-step testing)
            const clickResult = await this.client.send('Runtime.evaluate', {
                expression: `
          (function() {
            const links = document.querySelectorAll('a');
            
            for (let link of links) {
              const text = link.textContent || '';
              const href = link.href || '';
              
              if (text.includes('${projectNumber}') && href.includes('ProjektDetailPage')) {
                // Extract project ID from URL before clicking
                const match = href.match(/projektId=(\d+)/);
                const projektId = match ? match[1] : null;
                
                link.click();
                return { clicked: true, projektId };
              }
            }
            
            return { clicked: false };
          })();
        `,
                returnByValue: true
            });
            if (!clickResult.result.value.clicked) {
                throw new Error(`Project detail link for ${projectNumber} not found`);
            }
            // Wait for project detail page to load
            await this.sleep(7000);
            await this.extractFormState();
            logger.debug(`Successfully navigated to project detail: ${projectNumber}`);
            return clickResult.result.value.projektId || '76036'; // Default for testing
        }
        catch (error) {
            throw new NetworkError(`Failed to navigate to project detail ${projectNumber}`, projectNumber, error);
        }
    }
    /**
     * Ensure PDF download permission checkbox is checked and save changes
     */
    async ensurePDFDownloadPermission() {
        try {
            logger.debug('Checking "Povolit stažení PDF formuláře podpořené osoby" checkbox');
            const checkResult = await this.client.send('Runtime.evaluate', {
                expression: `
          (function() {
            const checkbox = document.getElementById('projektDetailTabs_Projekt_AllowDownloadPdfFormPO') ||
                           document.querySelector('input[name*="AllowDownloadPdfFormPO"]');
            
            if (checkbox) {
              const wasChecked = checkbox.checked;
              if (!wasChecked) {
                checkbox.checked = true;
                // Trigger the onclick handler if exists
                if (checkbox.onclick) {
                  checkbox.onclick();
                } else if (window.AllowDownloadPdfFormPOItemClick) {
                  window.AllowDownloadPdfFormPOItemClick(checkbox);
                }
              }
              return { exists: true, wasChecked, nowChecked: checkbox.checked };
            }
            
            return { exists: false };
          })();
        `,
                returnByValue: true
            });
            if (!checkResult.result.value.exists) {
                logger.warn('PDF download permission checkbox not found - proceeding anyway');
                return;
            }
            if (!checkResult.result.value.wasChecked) {
                logger.debug('Checkbox "Povolit stažení PDF formuláře podpořené osoby" was not checked - enabled it');
                // Save the changes by clicking the "Uložit" button
                const saveResult = await this.client.send('Runtime.evaluate', {
                    expression: `
            (function() {
              const saveButton = document.getElementById('_Save') ||
                             document.querySelector('button[name="ctl00$ctl00$_Save"]') ||
                             document.querySelector('button[value="Uložit"]');
              
              if (saveButton && !saveButton.disabled) {
                saveButton.click();
                return { clicked: true, buttonText: saveButton.textContent.trim() };
              }
              
              return { clicked: false, reason: saveButton ? 'disabled' : 'not found' };
            })();
          `,
                    returnByValue: true
                });
                if (saveResult.result.value.clicked) {
                    logger.debug('Successfully clicked "Uložit" button to save PDF permission');
                    // Wait for save operation to complete
                    await this.sleep(3000);
                }
                else {
                    logger.warn(`Could not click save button: ${saveResult.result.value.reason}`);
                }
            }
            else {
                logger.debug('PDF download permission already enabled');
            }
        }
        catch (error) {
            logger.warn(`Failed to check PDF download permission: ${error.message}`);
            // Non-critical error - continue anyway
        }
    }
    /**
     * Click on "Podpořené osoby" tab to show participants
     */
    async clickSupportedPersonsTab() {
        try {
            logger.debug('Clicking on Podpořené osoby tab');
            const clickResult = await this.client.send('Runtime.evaluate', {
                expression: `
          (function() {
            const tab = document.querySelector('a[href="#projektDetailTabs_ctl337"]');
            if (tab && tab.textContent.includes('Podpořené osoby')) {
              // Check if already active
              const isActive = tab.getAttribute('aria-expanded') === 'true';
              if (!isActive) {
                tab.click();
              }
              return { clicked: !isActive, wasActive: isActive };
            }
            return { clicked: false };
          })();
        `,
                returnByValue: true
            });
            if (!clickResult.result.value.clicked && !clickResult.result.value.wasActive) {
                throw new Error('Could not find or click "Podpořené osoby" tab');
            }
            if (clickResult.result.value.clicked) {
                // Wait for tab content to load
                await this.sleep(3000);
                logger.debug('Successfully clicked Podpořené osoby tab');
            }
            else {
                logger.debug('Podpořené osoby tab was already active');
            }
        }
        catch (error) {
            throw new NetworkError('Failed to click supported persons tab', '', error);
        }
    }
    /**
     * Set page size to 50 to show more participants
     */
    async setPageSizeTo50() {
        try {
            logger.debug('Setting page size to 50');
            const setResult = await this.client.send('Runtime.evaluate', {
                expression: `
          (function() {
            // Find visible page size select in active tab
            const selects = document.querySelectorAll('select.acgp-pageSize');
            
            for (let select of selects) {
              const style = window.getComputedStyle(select);
              const parent = select.closest('.tab-pane');
              
              // Check if this select is visible
              if (style.display !== 'none' && 
                  (!parent || window.getComputedStyle(parent).display !== 'none')) {
                
                const originalValue = select.value;
                
                // Check if already set to 50
                if (originalValue === '50') {
                  return { success: true, alreadySet: true, originalValue };
                }
                
                // Set to 50
                select.value = '50';
                
                // Trigger change event
                const changeEvent = new Event('change', { bubbles: true });
                select.dispatchEvent(changeEvent);
                
                // Also trigger onchange if exists
                if (select.onchange) {
                  select.onchange();
                }
                
                return { success: true, alreadySet: false, originalValue, newValue: select.value };
              }
            }
            
            return { success: false, reason: 'No visible page size select found' };
          })();
        `,
                returnByValue: true
            });
            if (setResult.result.value.success) {
                if (setResult.result.value.alreadySet) {
                    logger.debug('Page size already set to 50');
                }
                else {
                    logger.debug(`Page size changed from ${setResult.result.value.originalValue} to 50`);
                    // Wait for page to reload with more participants
                    await this.sleep(5000);
                }
            }
            else {
                logger.warn('Could not set page size to 50 - continuing with default');
            }
        }
        catch (error) {
            logger.warn(`Failed to set page size: ${error.message}`);
            // Non-critical error - continue anyway
        }
    }
    /**
     * Extract ASP.NET ViewState and EventValidation from current page
     */
    async extractFormState() {
        try {
            const stateResult = await this.client.send('Runtime.evaluate', {
                expression: `
          const viewState = document.querySelector('input[name="__VIEWSTATE"]');
          const eventValidation = document.querySelector('input[name="__EVENTVALIDATION"]');
          
          ({
            viewState: viewState ? viewState.value : null,
            eventValidation: eventValidation ? eventValidation.value : null
          });
        `,
                returnByValue: true
            });
            const state = stateResult.result.value;
            if (state) {
                this.viewState = state.viewState;
                this.eventValidation = state.eventValidation;
                logger.debug('Extracted form state', undefined, {
                    hasViewState: !!this.viewState,
                    hasEventValidation: !!this.eventValidation,
                    viewStateLength: this.viewState ? this.viewState.length : 0
                });
            }
        }
        catch (error) {
            logger.debug('Failed to extract form state', undefined, { error: error.message });
        }
    }
    /**
     * Extract participants list from current page (ProjektDetailPage)
     */
    async extractParticipantsList() {
        try {
            const participantsResult = await this.client.send('Runtime.evaluate', {
                expression: `
          (function() {
            const participants = [];
            
            // Look for links to participant detail pages (based on testing)
            const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
            let seenIds = new Set();
            
            for (let link of links) {
              const href = link.href;
              const text = link.textContent.trim();
              
              // Extract participant ID from URL
              const match = href.match(/podporenaOsobaProjektuId=(\\d+)/);
              if (match && !seenIds.has(match[1]) && text.length > 1) {
                seenIds.add(match[1]);
                participants.push({
                  id: match[1],
                  name: text,
                  detailUrl: href
                });
              }
            }
            
            return participants;
          })();
        `,
                returnByValue: true
            });
            const participants = participantsResult.result.value || [];
            logger.debug(`Extracted ${participants.length} participants from project detail page`);
            return participants;
        }
        catch (error) {
            logger.error('Failed to extract participants list', error);
            return [];
        }
    }
    /**
     * Download PDF for a specific participant using optimized direct navigation
     */
    async downloadParticipantPDF(participant, projectNumber) {
        try {
            logger.debug(`Downloading PDF for participant: ${participant.name} (ID: ${participant.id})`);
            // Direct navigation to participant detail page
            if (!participant.detailUrl) {
                throw new Error(`No detail URL for participant ${participant.name}`);
            }
            // Ensure full URL
            const fullUrl = participant.detailUrl.includes('http') ?
                participant.detailUrl :
                `https://esf2014.esfcr.cz${participant.detailUrl}`;
            logger.debug(`Navigating directly to: ${fullUrl}`);
            // Navigate using window.location for speed
            await this.client.send('Runtime.evaluate', {
                expression: `window.location.href = '${fullUrl}';`,
                returnByValue: true
            });
            // Wait for page load
            await this.sleep(6000);
            // Verify we're on correct page
            const verifyResult = await this.client.send('Runtime.evaluate', {
                expression: `
          (function() {
            return {
              currentUrl: window.location.href,
              hasCorrectId: window.location.href.includes('${participant.id}'),
              title: document.title,
              hasPDFButton: !!document.getElementById('_TiskDoPdf')
            };
          })();
        `,
                returnByValue: true
            });
            if (!verifyResult.result.value.hasCorrectId) {
                throw new Error(`Navigation failed - not on participant ${participant.id} page`);
            }
            if (!verifyResult.result.value.hasPDFButton) {
                throw new Error('PDF download button not found on page');
            }
            // Click PDF download button
            const pdfResult = await this.client.send('Runtime.evaluate', {
                expression: `
          (function() {
            const button = document.getElementById('_TiskDoPdf');
            if (button && !button.disabled) {
              button.click();
              return { clicked: true, buttonText: button.textContent.trim() };
            }
            return { clicked: false, reason: button ? 'disabled' : 'not found' };
          })();
        `,
                returnByValue: true
            });
            if (!pdfResult.result.value.clicked) {
                throw new Error(`Could not click PDF button: ${pdfResult.result.value.reason}`);
            }
            logger.debug(`PDF button clicked for ${participant.name}`);
            // Wait for PDF download
            await this.sleep(7000);
            // Return card info
            return {
                participantName: participant.name,
                participantId: participant.id,
                downloadUrl: fullUrl, // Use the actual detail URL
                fileName: this.generateFileName(participant.name, participant.id),
                projectNumber
            };
        }
        catch (error) {
            logger.error(`Failed to download PDF for ${participant.name}`, error);
            return null;
        }
    }
    /**
     * Generate safe filename for participant PDF
     */
    generateFileName(name, id) {
        // Clean the name for safe filename
        const safeName = name
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .toLowerCase();
        const safeId = id.replace(/[^a-zA-Z0-9]/g, '');
        return `participant_${safeName}_${safeId}.pdf`;
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Set progress callback for download tracking
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
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
        this.viewState = null;
        this.eventValidation = null;
        this.progressCallback = undefined;
    }
}
//# sourceMappingURL=ESFPortal.js.map