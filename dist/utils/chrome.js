import { NetworkError } from '../types/index.js';
import { CHROME_CONFIG } from '../config/defaults.js';
import { logger } from './logger.js';
/**
 * Chrome utilities for browser automation
 * Provides high-level functions for common browser operations
 */
export class ChromeUtils {
    client;
    port;
    constructor(client, port = CHROME_CONFIG.DEFAULT_PORT) {
        this.client = client;
        this.port = port;
    }
    /**
     * Navigate to URL and wait for load
     */
    async navigateAndWait(url, timeout = 30000) {
        try {
            logger.debug(`Navigating to: ${url}`);
            // Navigate to URL
            await this.client.send('Page.navigate', { url });
            // Wait for page load with timeout
            await this.waitForPageLoad(timeout);
            logger.debug(`Navigation completed: ${url}`);
        }
        catch (error) {
            throw new NetworkError(`Failed to navigate to ${url}`, undefined, error);
        }
    }
    /**
     * Wait for page to load completely
     */
    async waitForPageLoad(timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.client.off('Page.loadEventFired', onLoadEventFired);
                reject(new Error('Page load timeout'));
            }, timeout);
            const onLoadEventFired = () => {
                clearTimeout(timer);
                this.client.off('Page.loadEventFired', onLoadEventFired);
                resolve();
            };
            this.client.on('Page.loadEventFired', onLoadEventFired);
        });
    }
    /**
     * Wait for element to appear on page
     */
    async waitForElement(selector, timeout = 10000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                const result = await this.client.send('Runtime.evaluate', {
                    expression: `document.querySelector('${selector}') !== null`,
                    returnByValue: true
                });
                if (result.result.value === true) {
                    logger.debug(`Element found: ${selector}`);
                    return true;
                }
                // Wait 500ms before next check
                await this.sleep(500);
            }
            catch (error) {
                // Continue waiting
            }
        }
        logger.debug(`Element not found within timeout: ${selector}`);
        return false;
    }
    /**
     * Get page title
     */
    async getPageTitle() {
        try {
            const result = await this.client.send('Runtime.evaluate', {
                expression: 'document.title',
                returnByValue: true
            });
            return result.result.value || '';
        }
        catch (error) {
            logger.warn('Failed to get page title', undefined, { error: error.message });
            return '';
        }
    }
    /**
     * Get current URL
     */
    async getCurrentUrl() {
        try {
            const result = await this.client.send('Runtime.evaluate', {
                expression: 'window.location.href',
                returnByValue: true
            });
            return result.result.value || '';
        }
        catch (error) {
            logger.warn('Failed to get current URL', undefined, { error: error.message });
            return '';
        }
    }
    /**
     * Check if element exists on page
     */
    async elementExists(selector) {
        try {
            const result = await this.client.send('Runtime.evaluate', {
                expression: `document.querySelector('${selector}') !== null`,
                returnByValue: true
            });
            return result.result.value === true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get element text content
     */
    async getElementText(selector) {
        try {
            const result = await this.client.send('Runtime.evaluate', {
                expression: `
          const element = document.querySelector('${selector}');
          element ? element.textContent.trim() : null;
        `,
                returnByValue: true
            });
            return result.result.value;
        }
        catch (error) {
            logger.debug(`Failed to get text for element: ${selector}`, undefined, { error: error.message });
            return null;
        }
    }
    /**
     * Get all elements matching selector with their attributes
     */
    async getElements(selector, attributes = ['href', 'src', 'textContent']) {
        try {
            const attributesStr = attributes.map(attr => attr === 'textContent' ? 'textContent: el.textContent.trim()' : `${attr}: el.getAttribute('${attr}')`).join(', ');
            const result = await this.client.send('Runtime.evaluate', {
                expression: `
          Array.from(document.querySelectorAll('${selector}')).map(el => ({
            ${attributesStr}
          }));
        `,
                returnByValue: true
            });
            return result.result.value || [];
        }
        catch (error) {
            logger.debug(`Failed to get elements: ${selector}`, undefined, { error: error.message });
            return [];
        }
    }
    /**
     * Click element by selector
     */
    async clickElement(selector) {
        try {
            const result = await this.client.send('Runtime.evaluate', {
                expression: `
          const element = document.querySelector('${selector}');
          if (element) {
            element.click();
            true;
          } else {
            false;
          }
        `,
                returnByValue: true
            });
            if (result.result.value) {
                logger.debug(`Clicked element: ${selector}`);
                return true;
            }
            else {
                logger.debug(`Element not found for click: ${selector}`);
                return false;
            }
        }
        catch (error) {
            logger.debug(`Failed to click element: ${selector}`, undefined, { error: error.message });
            return false;
        }
    }
    /**
     * Scroll page to bottom to load dynamic content
     */
    async scrollToBottom(pauseTime = 1000) {
        try {
            await this.client.send('Runtime.evaluate', {
                expression: 'window.scrollTo(0, document.body.scrollHeight);'
            });
            await this.sleep(pauseTime);
            logger.debug('Scrolled to bottom of page');
        }
        catch (error) {
            logger.debug('Failed to scroll to bottom', undefined, { error: error.message });
        }
    }
    /**
     * Get page cookies
     */
    async getCookies() {
        try {
            const result = await this.client.send('Network.getCookies');
            return result.cookies || [];
        }
        catch (error) {
            logger.debug('Failed to get cookies', undefined, { error: error.message });
            return [];
        }
    }
    /**
     * Check if user is logged in to ESF based on URL patterns
     */
    async isLoggedInToESF() {
        try {
            const currentUrl = await this.getCurrentUrl();
            const title = await this.getPageTitle();
            // Check for authentication redirect
            if (currentUrl.includes('identita.gov.cz')) {
                logger.debug('Detected identity.gov.cz - authentication required');
                return false;
            }
            // Check for ESF portal indicators
            if (currentUrl.includes('esf.gov.cz') && !currentUrl.includes('login')) {
                logger.debug('Detected ESF portal access - user appears logged in');
                return true;
            }
            // Check page title for authentication indicators
            if (title.toLowerCase().includes('přihlášení') || title.toLowerCase().includes('login')) {
                logger.debug('Detected login page - authentication required');
                return false;
            }
            return false;
        }
        catch (error) {
            logger.debug('Failed to check authentication status', undefined, { error: error.message });
            return false;
        }
    }
    /**
     * Extract PDF download links from current page
     */
    async extractPDFLinks() {
        try {
            const result = await this.client.send('Runtime.evaluate', {
                expression: `
          // Look for PDF links in various formats
          const pdfLinks = [];
          
          // Direct PDF links
          document.querySelectorAll('a[href*=".pdf"]').forEach(link => {
            const url = link.href;
            const filename = url.split('/').pop() || 'document.pdf';
            pdfLinks.push({ url, filename });
          });
          
          // Download buttons or links that might trigger PDF downloads
          document.querySelectorAll('a[href*="download"], a[href*="soubor"], button[onclick*="pdf"]').forEach(link => {
            const url = link.href || link.getAttribute('onclick');
            if (url) {
              const filename = link.textContent.trim() || 'document.pdf';
              pdfLinks.push({ url, filename: filename + '.pdf' });
            }
          });
          
          // Remove duplicates
          const unique = pdfLinks.filter((item, index, arr) => 
            arr.findIndex(t => t.url === item.url) === index
          );
          
          unique;
        `,
                returnByValue: true
            });
            const links = result.result.value || [];
            logger.debug(`Found ${links.length} potential PDF links`);
            return links;
        }
        catch (error) {
            logger.debug('Failed to extract PDF links', undefined, { error: error.message });
            return [];
        }
    }
    /**
     * Download file using Chrome's download capability
     */
    async downloadFile(url, filename) {
        try {
            // Enable download events
            await this.client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: './downloads' // This will be overridden by FileManager
            });
            // Navigate to the download URL
            await this.client.send('Page.navigate', { url });
            logger.debug(`Initiated download: ${filename} from ${url}`);
            return true;
        }
        catch (error) {
            logger.debug(`Failed to download file: ${filename}`, undefined, { error: error.message });
            return false;
        }
    }
    /**
     * Inject custom JavaScript for enhanced functionality
     */
    async injectScript(script) {
        try {
            const result = await this.client.send('Runtime.evaluate', {
                expression: script,
                returnByValue: true
            });
            return result.result.value;
        }
        catch (error) {
            logger.debug('Failed to inject script', undefined, { error: error.message });
            throw error;
        }
    }
    /**
     * Get network requests for analysis
     */
    async getNetworkRequests(urlPattern) {
        // This would require setting up network domain listeners
        // For now, return empty array
        return [];
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
/**
 * Factory function to create ChromeUtils instance
 */
export function createChromeUtils(client, port) {
    return new ChromeUtils(client, port);
}
/**
 * Test Chrome connection
 */
export async function testChromeConnection(port = CHROME_CONFIG.DEFAULT_PORT) {
    try {
        const testUrl = `http://${CHROME_CONFIG.DEFAULT_HOST}:${port}${CHROME_CONFIG.DEBUG_ENDPOINT}`;
        const response = await fetch(testUrl, {
            signal: AbortSignal.timeout(CHROME_CONFIG.CONNECTION_TIMEOUT)
        });
        if (!response.ok) {
            return false;
        }
        const data = await response.json();
        logger.debug('Chrome connection test successful', undefined, { version: data });
        return true;
    }
    catch (error) {
        logger.debug('Chrome connection test failed', undefined, { error: error.message });
        return false;
    }
}
//# sourceMappingURL=chrome.js.map