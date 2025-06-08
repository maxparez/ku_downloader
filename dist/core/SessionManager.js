import CDP from 'chrome-remote-interface';
import { NetworkError } from '../types/index.js';
import { CHROME_CONFIG } from '../config/defaults.js';
import { ESFEventEmitter } from '../events/EventEmitter.js';
import { logger } from '../utils/logger.js';
/**
 * Session Manager for ESF Downloader
 * Handles Chrome connection and session state
 */
export class SessionManager extends ESFEventEmitter {
    chromePort;
    client = null;
    sessionInfo;
    reconnectAttempts = 0;
    reconnectTimer = null;
    isConnecting = false;
    constructor(chromePort = CHROME_CONFIG.DEFAULT_PORT) {
        super();
        this.chromePort = chromePort;
        this.sessionInfo = {
            isConnected: false,
            isAuthenticated: false,
            chromePort,
            startTime: new Date(),
            lastActivity: new Date()
        };
    }
    /**
     * Connect to Chrome debug session
     */
    async connect() {
        if (this.isConnecting) {
            logger.debug('Connection already in progress');
            return;
        }
        if (this.sessionInfo.isConnected) {
            logger.debug('Already connected to Chrome');
            return;
        }
        this.isConnecting = true;
        try {
            logger.info(`Connecting to Chrome on port ${this.chromePort}`);
            // Test Chrome availability first
            await this.testChromeAvailability();
            // Connect to Chrome
            this.client = await CDP({ port: this.chromePort });
            // Enable required domains
            await this.enableDomains();
            // Setup event handlers
            this.setupEventHandlers();
            this.sessionInfo.isConnected = true;
            this.sessionInfo.lastActivity = new Date();
            this.reconnectAttempts = 0;
            logger.sessionConnected(this.chromePort);
            this.emitSessionStatus('connected', { chromePort: this.chromePort });
        }
        catch (error) {
            logger.error('Failed to connect to Chrome', error);
            this.handleConnectionError(error);
            throw new NetworkError(`Failed to connect to Chrome on port ${this.chromePort}: ${error.message}`, undefined, error);
        }
        finally {
            this.isConnecting = false;
        }
    }
    /**
     * Disconnect from Chrome
     */
    async disconnect() {
        try {
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            if (this.client) {
                await this.client.close();
                this.client = null;
            }
            this.sessionInfo.isConnected = false;
            this.sessionInfo.isAuthenticated = false;
            logger.sessionDisconnected();
            this.emitSessionStatus('disconnected');
        }
        catch (error) {
            logger.error('Error during disconnect', error);
        }
    }
    /**
     * Check if session is connected
     */
    isConnected() {
        return this.sessionInfo.isConnected && this.client !== null;
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.sessionInfo.isAuthenticated;
    }
    /**
     * Get session information
     */
    getSessionInfo() {
        return { ...this.sessionInfo };
    }
    /**
     * Update authentication status
     */
    setAuthenticationStatus(isAuthenticated) {
        const wasAuthenticated = this.sessionInfo.isAuthenticated;
        this.sessionInfo.isAuthenticated = isAuthenticated;
        this.sessionInfo.lastActivity = new Date();
        if (isAuthenticated && !wasAuthenticated) {
            logger.info('User authenticated successfully');
            this.emitSessionStatus('connected', { authenticated: true });
        }
        else if (!isAuthenticated && wasAuthenticated) {
            logger.sessionAuthRequired();
            this.emitSessionStatus('connected', { authenticated: false });
        }
    }
    /**
     * Execute CDP command
     */
    async executeCommand(method, params) {
        if (!this.isConnected()) {
            throw new NetworkError('Not connected to Chrome');
        }
        try {
            this.sessionInfo.lastActivity = new Date();
            const result = await this.client.send(method, params);
            logger.debug(`CDP command executed: ${method}`, undefined, { method, params });
            return result;
        }
        catch (error) {
            logger.error(`CDP command failed: ${method}`, error, undefined, { method, params });
            throw new NetworkError(`CDP command failed: ${method}`, undefined, error);
        }
    }
    /**
     * Navigate to URL
     */
    async navigateToUrl(url) {
        try {
            logger.debug(`Navigating to: ${url}`);
            await this.executeCommand('Page.navigate', { url });
            // Wait for page load
            await this.waitForPageLoad();
            this.sessionInfo.lastActivity = new Date();
            logger.debug(`Navigation completed: ${url}`);
        }
        catch (error) {
            logger.error(`Navigation failed: ${url}`, error);
            throw new NetworkError(`Failed to navigate to ${url}`, undefined, error);
        }
    }
    /**
     * Wait for page to load
     */
    async waitForPageLoad(timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
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
     * Test Chrome availability
     */
    async testChromeAvailability() {
        const testUrl = `http://${CHROME_CONFIG.DEFAULT_HOST}:${this.chromePort}${CHROME_CONFIG.DEBUG_ENDPOINT}`;
        try {
            const response = await fetch(testUrl, {
                signal: AbortSignal.timeout(CHROME_CONFIG.CONNECTION_TIMEOUT)
            });
            if (!response.ok) {
                throw new Error(`Chrome debug endpoint returned ${response.status}`);
            }
            const data = await response.json();
            logger.debug('Chrome debug endpoint available', undefined, { version: data });
        }
        catch (error) {
            throw new Error(`Chrome is not running in debug mode on port ${this.chromePort}. ` +
                `Please start Chrome with: google-chrome --headless --remote-debugging-port=${this.chromePort}`);
        }
    }
    /**
     * Enable required CDP domains
     */
    async enableDomains() {
        const domains = ['Page', 'Network', 'Runtime', 'Security'];
        for (const domain of domains) {
            try {
                await this.client.send(`${domain}.enable`);
                logger.debug(`Enabled CDP domain: ${domain}`);
            }
            catch (error) {
                logger.warn(`Failed to enable CDP domain: ${domain}`, undefined, { error: error.message });
            }
        }
    }
    /**
     * Setup Chrome event handlers
     */
    setupEventHandlers() {
        if (!this.client)
            return;
        // Handle disconnection
        this.client.on('disconnect', () => {
            logger.warn('Chrome disconnected unexpectedly');
            this.sessionInfo.isConnected = false;
            this.sessionInfo.isAuthenticated = false;
            this.emitSessionStatus('disconnected');
            this.scheduleReconnect();
        });
        // Handle page events
        this.client.on('Page.loadEventFired', () => {
            this.sessionInfo.lastActivity = new Date();
        });
        // Handle network events for authentication detection
        this.client.on('Network.responseReceived', (params) => {
            this.handleNetworkResponse(params);
        });
        // Handle security events
        this.client.on('Security.securityStateChanged', (params) => {
            logger.debug('Security state changed', undefined, { securityState: params.securityState });
        });
    }
    /**
     * Handle network responses for authentication detection
     */
    handleNetworkResponse(params) {
        const { response } = params;
        const url = response.url;
        // Detect authentication pages
        if (url.includes('identita.gov.cz')) {
            this.setAuthenticationStatus(false);
        }
        else if (url.includes('esf.gov.cz') && response.status === 200) {
            // Successful ESF access might indicate authentication
            this.setAuthenticationStatus(true);
        }
        // Detect authentication failures
        if (response.status === 401 || response.status === 403) {
            this.setAuthenticationStatus(false);
        }
    }
    /**
     * Handle connection errors
     */
    handleConnectionError(error) {
        this.sessionInfo.isConnected = false;
        this.sessionInfo.isAuthenticated = false;
        this.emitSessionStatus('disconnected');
        if (this.reconnectAttempts < CHROME_CONFIG.RECONNECT_ATTEMPTS) {
            this.scheduleReconnect();
        }
        else {
            logger.error('Max reconnection attempts reached', error);
            this.emitNetworkError('Max reconnection attempts reached', undefined, error);
        }
    }
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return; // Already scheduled
        }
        this.reconnectAttempts++;
        const delay = CHROME_CONFIG.RECONNECT_DELAY * this.reconnectAttempts;
        logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts}/${CHROME_CONFIG.RECONNECT_ATTEMPTS} in ${delay}ms`);
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.connect();
            }
            catch (error) {
                logger.error(`Reconnect attempt ${this.reconnectAttempts} failed`, error);
            }
        }, delay);
    }
    /**
     * Get Chrome connection details
     */
    getChromeConnection() {
        return {
            port: this.chromePort,
            host: CHROME_CONFIG.DEFAULT_HOST,
            webSocketDebuggerUrl: `ws://${CHROME_CONFIG.DEFAULT_HOST}:${this.chromePort}/devtools/browser`,
            isConnected: this.isConnected()
        };
    }
    /**
     * Get CDP client instance
     */
    getClient() {
        if (!this.client) {
            throw new NetworkError('Chrome client not connected');
        }
        return this.client;
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.disconnect();
            this.removeAllESFListeners();
            logger.debug('SessionManager cleanup completed');
        }
        catch (error) {
            logger.error('Error during SessionManager cleanup', error);
        }
    }
}
//# sourceMappingURL=SessionManager.js.map