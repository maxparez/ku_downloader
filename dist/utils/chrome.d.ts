import type { CDPClient } from '../types/index.js';
/**
 * Chrome utilities for browser automation
 * Provides high-level functions for common browser operations
 */
export declare class ChromeUtils {
    private client;
    private port;
    constructor(client: CDPClient, port?: number);
    /**
     * Navigate to URL and wait for load
     */
    navigateAndWait(url: string, timeout?: number): Promise<void>;
    /**
     * Wait for page to load completely
     */
    waitForPageLoad(timeout?: number): Promise<void>;
    /**
     * Wait for element to appear on page
     */
    waitForElement(selector: string, timeout?: number): Promise<boolean>;
    /**
     * Get page title
     */
    getPageTitle(): Promise<string>;
    /**
     * Get current URL
     */
    getCurrentUrl(): Promise<string>;
    /**
     * Check if element exists on page
     */
    elementExists(selector: string): Promise<boolean>;
    /**
     * Get element text content
     */
    getElementText(selector: string): Promise<string | null>;
    /**
     * Get all elements matching selector with their attributes
     */
    getElements(selector: string, attributes?: string[]): Promise<any[]>;
    /**
     * Click element by selector
     */
    clickElement(selector: string): Promise<boolean>;
    /**
     * Scroll page to bottom to load dynamic content
     */
    scrollToBottom(pauseTime?: number): Promise<void>;
    /**
     * Get page cookies
     */
    getCookies(): Promise<any[]>;
    /**
     * Check if user is logged in to ESF based on URL patterns
     */
    isLoggedInToESF(): Promise<boolean>;
    /**
     * Extract PDF download links from current page
     */
    extractPDFLinks(): Promise<{
        url: string;
        filename: string;
    }[]>;
    /**
     * Download file using Chrome's download capability
     */
    downloadFile(url: string, filename: string): Promise<boolean>;
    /**
     * Inject custom JavaScript for enhanced functionality
     */
    injectScript(script: string): Promise<any>;
    /**
     * Get network requests for analysis
     */
    getNetworkRequests(urlPattern?: string): Promise<any[]>;
    /**
     * Sleep utility
     */
    private sleep;
}
/**
 * Factory function to create ChromeUtils instance
 */
export declare function createChromeUtils(client: CDPClient, port?: number): ChromeUtils;
/**
 * Test Chrome connection
 */
export declare function testChromeConnection(port?: number): Promise<boolean>;
//# sourceMappingURL=chrome.d.ts.map