import CDP from 'chrome-remote-interface';
import type { 
  SessionInfo, 
  ChromeConnection,
  CDPClient
} from '../types/index.js';
import { NetworkError, AuthError } from '../types/index.js';
import { CHROME_CONFIG } from '../config/defaults.js';
import { ESFEventEmitter } from '../events/EventEmitter.js';
import { logger } from '../utils/logger.js';
import { ChromeTabManager } from '../utils/chrome-tabs.js';

/**
 * Session Manager for ESF Downloader
 * Handles Chrome connection and session state
 */
export class SessionManager extends ESFEventEmitter {
  private client: CDPClient | null = null;
  private sessionInfo: SessionInfo;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private tabManager: ChromeTabManager;

  constructor(private chromePort: number = CHROME_CONFIG.DEFAULT_PORT) {
    super();
    
    this.tabManager = new ChromeTabManager(chromePort);
    
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
  async connect(): Promise<void> {
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
      
      // Log available tabs for debugging
      await this.tabManager.logAvailableTabs();
      
      // Find appropriate tab
      let targetTab = await this.tabManager.findESFTab();
      if (!targetTab) {
        targetTab = await this.tabManager.findActiveTab();
        if (targetTab) {
          logger.warn(`No ESF tab found, using active tab: ${targetTab.title}`);
        }
      }
      
      // Connect to Chrome (with specific tab if found)
      const connectionOptions: any = { port: this.chromePort };
      if (targetTab) {
        connectionOptions.target = this.tabManager.getTargetForTab(targetTab);
        logger.info(`Connecting to specific tab: ${targetTab.id} - ${targetTab.url}`);
      }
      
      this.client = await CDP(connectionOptions);
      
      // Enable required domains
      await this.enableDomains();
      
      // Setup event handlers
      this.setupEventHandlers();
      
      this.sessionInfo.isConnected = true;
      this.sessionInfo.lastActivity = new Date();
      this.reconnectAttempts = 0;
      
      logger.sessionConnected(this.chromePort);
      this.emitSessionStatus('connected', { chromePort: this.chromePort });
      
    } catch (error) {
      logger.error('Failed to connect to Chrome', error as Error);
      this.handleConnectionError(error as Error);
      throw new NetworkError(
        `Failed to connect to Chrome on port ${this.chromePort}: ${(error as Error).message}`,
        undefined,
        error as Error
      );
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from Chrome
   */
  async disconnect(): Promise<void> {
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
      
    } catch (error) {
      logger.error('Error during disconnect', error as Error);
    }
  }

  /**
   * Check if session is connected
   */
  isConnected(): boolean {
    return this.sessionInfo.isConnected && this.client !== null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionInfo.isAuthenticated;
  }

  /**
   * Get session information
   */
  getSessionInfo(): SessionInfo {
    return { ...this.sessionInfo };
  }

  /**
   * Update authentication status
   */
  setAuthenticationStatus(isAuthenticated: boolean): void {
    const wasAuthenticated = this.sessionInfo.isAuthenticated;
    this.sessionInfo.isAuthenticated = isAuthenticated;
    this.sessionInfo.lastActivity = new Date();

    if (isAuthenticated && !wasAuthenticated) {
      logger.info('User authenticated successfully');
      this.emitSessionStatus('connected', { authenticated: true });
    } else if (!isAuthenticated && wasAuthenticated) {
      logger.sessionAuthRequired();
      this.emitSessionStatus('connected', { authenticated: false });
    }
  }

  /**
   * Execute CDP command
   */
  async executeCommand(method: string, params?: any): Promise<any> {
    if (!this.isConnected()) {
      throw new NetworkError('Not connected to Chrome');
    }

    try {
      this.sessionInfo.lastActivity = new Date();
      const result = await this.client!.send(method, params);
      logger.debug(`CDP command executed: ${method}`, undefined, { method, params });
      return result;
    } catch (error) {
      logger.error(`CDP command failed: ${method}`, error as Error, undefined, { method, params });
      throw new NetworkError(`CDP command failed: ${method}`, undefined, error as Error);
    }
  }

  /**
   * Navigate to URL
   */
  async navigateToUrl(url: string): Promise<void> {
    try {
      logger.debug(`Navigating to: ${url}`);
      await this.executeCommand('Page.navigate', { url });
      
      // Wait for page load
      await this.waitForPageLoad();
      
      this.sessionInfo.lastActivity = new Date();
      logger.debug(`Navigation completed: ${url}`);
      
    } catch (error) {
      logger.error(`Navigation failed: ${url}`, error as Error);
      throw new NetworkError(`Failed to navigate to ${url}`, undefined, error as Error);
    }
  }

  /**
   * Wait for page to load
   */
  private async waitForPageLoad(timeout: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Page load timeout'));
      }, timeout);

      const onLoadEventFired = () => {
        clearTimeout(timer);
        this.client!.off('Page.loadEventFired', onLoadEventFired);
        resolve();
      };

      this.client!.on('Page.loadEventFired', onLoadEventFired);
    });
  }

  /**
   * Test Chrome availability
   */
  private async testChromeAvailability(): Promise<void> {
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
      
    } catch (error) {
      throw new Error(
        `Chrome is not running in debug mode on port ${this.chromePort}. ` +
        `Please start Chrome with: google-chrome --headless --remote-debugging-port=${this.chromePort}`
      );
    }
  }

  /**
   * Enable required CDP domains
   */
  private async enableDomains(): Promise<void> {
    const domains = ['Page', 'Network', 'Runtime', 'Security'];
    
    for (const domain of domains) {
      try {
        await this.client!.send(`${domain}.enable`);
        logger.debug(`Enabled CDP domain: ${domain}`);
      } catch (error) {
        logger.warn(`Failed to enable CDP domain: ${domain}`, undefined, { error: (error as Error).message });
      }
    }
  }

  /**
   * Setup Chrome event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

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
    this.client.on('Network.responseReceived', (params: any) => {
      this.handleNetworkResponse(params);
    });

    // Handle security events
    this.client.on('Security.securityStateChanged', (params: any) => {
      logger.debug('Security state changed', undefined, { securityState: params.securityState });
    });
  }

  /**
   * Handle network responses for authentication detection
   */
  private handleNetworkResponse(params: any): void {
    const { response } = params;
    const url = response.url;

    // Detect authentication pages
    if (url.includes('identita.gov.cz')) {
      this.setAuthenticationStatus(false);
    } else if (url.includes('esf.gov.cz') && response.status === 200) {
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
  private handleConnectionError(error: Error): void {
    this.sessionInfo.isConnected = false;
    this.sessionInfo.isAuthenticated = false;
    this.emitSessionStatus('disconnected');

    if (this.reconnectAttempts < CHROME_CONFIG.RECONNECT_ATTEMPTS) {
      this.scheduleReconnect();
    } else {
      logger.error('Max reconnection attempts reached', error);
      this.emitNetworkError('Max reconnection attempts reached', undefined, error);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
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
      } catch (error) {
        logger.error(`Reconnect attempt ${this.reconnectAttempts} failed`, error as Error);
      }
    }, delay);
  }

  /**
   * Get Chrome connection details
   */
  getChromeConnection(): ChromeConnection {
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
  getClient(): CDPClient {
    if (!this.client) {
      throw new NetworkError('Chrome client not connected');
    }
    return this.client;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.disconnect();
      this.removeAllESFListeners();
      logger.debug('SessionManager cleanup completed');
    } catch (error) {
      logger.error('Error during SessionManager cleanup', error as Error);
    }
  }
}