import { logger } from './logger.js';
/**
 * Chrome Tab management utilities
 */
export class ChromeTabManager {
    chromePort;
    constructor(chromePort = 9222) {
        this.chromePort = chromePort;
    }
    /**
     * Get list of all Chrome tabs
     */
    async listTabs() {
        try {
            const response = await fetch(`http://localhost:${this.chromePort}/json`, {
                signal: AbortSignal.timeout(5000)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data.filter((tab) => tab.type === 'page');
        }
        catch (error) {
            logger.error(`Failed to list Chrome tabs: ${error.message}`);
            throw new Error(`Cannot connect to Chrome debug port ${this.chromePort}`);
        }
    }
    /**
     * Find ESF-related tab (ESF or identita.gov.cz)
     */
    async findESFTab() {
        const tabs = await this.listTabs();
        // Look for ESF or identita.gov.cz tabs
        const esfTab = tabs.find(tab => tab.url.includes('esf') ||
            tab.url.includes('identita.gov.cz') ||
            tab.url.includes('esfcr.cz'));
        if (esfTab) {
            logger.info(`Found ESF-related tab: ${esfTab.title} - ${esfTab.url}`);
            return esfTab;
        }
        return null;
    }
    /**
     * Find active tab (most recently focused)
     */
    async findActiveTab() {
        const tabs = await this.listTabs();
        // Return first non-empty tab
        const activeTab = tabs.find(tab => tab.url !== 'chrome://newtab/' &&
            tab.url !== 'about:blank' &&
            !tab.url.startsWith('chrome-extension://'));
        if (activeTab) {
            logger.info(`Found active tab: ${activeTab.title} - ${activeTab.url}`);
            return activeTab;
        }
        return null;
    }
    /**
     * Select specific tab for CDP connection
     */
    getTargetForTab(tab) {
        return tab.id;
    }
    /**
     * Display available tabs for debugging
     */
    async logAvailableTabs() {
        try {
            const tabs = await this.listTabs();
            logger.info(`Available Chrome tabs (${tabs.length}):`);
            tabs.forEach(tab => {
                logger.info(`  Tab ${tab.id}: ${tab.title.substring(0, 50)} - ${tab.url.substring(0, 80)}`);
            });
        }
        catch (error) {
            logger.error(`Failed to log available tabs: ${error.message}`);
        }
    }
}
//# sourceMappingURL=chrome-tabs.js.map