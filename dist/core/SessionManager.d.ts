import type { SessionInfo, ChromeConnection } from '../types/index';
import { ESFEventEmitter } from '@events/EventEmitter.js';
/**
 * Session Manager for ESF Downloader
 * Handles Chrome connection and session state
 */
export declare class SessionManager extends ESFEventEmitter {
    private chromePort;
    private client;
    private sessionInfo;
    private reconnectAttempts;
    private reconnectTimer;
    private isConnecting;
    constructor(chromePort?: number);
    /**
     * Connect to Chrome debug session
     */
    connect(): Promise<void>;
    /**
     * Disconnect from Chrome
     */
    disconnect(): Promise<void>;
    /**
     * Check if session is connected
     */
    isConnected(): boolean;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Get session information
     */
    getSessionInfo(): SessionInfo;
    /**
     * Update authentication status
     */
    setAuthenticationStatus(isAuthenticated: boolean): void;
    /**
     * Execute CDP command
     */
    executeCommand(method: string, params?: any): Promise<any>;
    /**
     * Navigate to URL
     */
    navigateToUrl(url: string): Promise<void>;
    /**
     * Wait for page to load
     */
    private waitForPageLoad;
    /**
     * Test Chrome availability
     */
    private testChromeAvailability;
    /**
     * Enable required CDP domains
     */
    private enableDomains;
    /**
     * Setup Chrome event handlers
     */
    private setupEventHandlers;
    /**
     * Handle network responses for authentication detection
     */
    private handleNetworkResponse;
    /**
     * Handle connection errors
     */
    private handleConnectionError;
    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect;
    /**
     * Get Chrome connection details
     */
    getChromeConnection(): ChromeConnection;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=SessionManager.d.ts.map