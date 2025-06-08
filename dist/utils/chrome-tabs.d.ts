export interface ChromeTab {
    id: string;
    title: string;
    url: string;
    type: string;
    webSocketDebuggerUrl?: string;
}
/**
 * Chrome Tab management utilities
 */
export declare class ChromeTabManager {
    private chromePort;
    constructor(chromePort?: number);
    /**
     * Get list of all Chrome tabs
     */
    listTabs(): Promise<ChromeTab[]>;
    /**
     * Find ESF-related tab (ESF or identita.gov.cz)
     */
    findESFTab(): Promise<ChromeTab | null>;
    /**
     * Find active tab (most recently focused)
     */
    findActiveTab(): Promise<ChromeTab | null>;
    /**
     * Select specific tab for CDP connection
     */
    getTargetForTab(tab: ChromeTab): string;
    /**
     * Display available tabs for debugging
     */
    logAvailableTabs(): Promise<void>;
}
//# sourceMappingURL=chrome-tabs.d.ts.map