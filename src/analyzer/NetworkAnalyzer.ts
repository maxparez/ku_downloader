import { writeFile } from 'fs/promises';
import path from 'path';
import type { CDPClient } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Network Traffic Analyzer for ESF Portal
 * Records network activity during manual workflow to understand portal behavior
 */

export interface NetworkRequest {
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  timestamp: number;
  resourceType?: string;
}

export interface NetworkResponse {
  requestId: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  timestamp: number;
  responseBody?: string;
  mimeType?: string;
}

export interface PageEvent {
  type: 'navigation' | 'dom-change' | 'user-action';
  url: string;
  title: string;
  timestamp: number;
  details?: any;
}

export interface AnalysisSession {
  startTime: number;
  endTime?: number;
  projectNumber?: string;
  requests: NetworkRequest[];
  responses: NetworkResponse[];
  pageEvents: PageEvent[];
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export class NetworkAnalyzer {
  private client: CDPClient;
  private session: AnalysisSession;
  private isRecording = false;
  private outputDir: string;

  constructor(client: CDPClient, outputDir: string = './analysis') {
    this.client = client;
    this.outputDir = outputDir;
    this.session = {
      startTime: Date.now(),
      requests: [],
      responses: [],
      pageEvents: [],
      cookies: [],
      localStorage: {},
      sessionStorage: {}
    };
  }

  /**
   * Start recording network traffic and page events
   */
  async startRecording(projectNumber?: string): Promise<void> {
    if (this.isRecording) {
      logger.warn('Analyzer is already recording');
      return;
    }

    this.isRecording = true;
    this.session = {
      startTime: Date.now(),
      projectNumber,
      requests: [],
      responses: [],
      pageEvents: [],
      cookies: [],
      localStorage: {},
      sessionStorage: {}
    };

    logger.info('🔍 Starting network analysis recording', projectNumber);

    try {
      // Enable necessary domains
      await this.client.send('Network.enable');
      await this.client.send('Page.enable');
      await this.client.send('Runtime.enable');
      await this.client.send('Security.enable');

      // Set up event listeners
      this.setupEventListeners();

      // Record initial page state
      await this.recordPageState('recording-start');

      logger.info('✅ Network analyzer recording started');
    } catch (error) {
      logger.error('Failed to start network recording', error as Error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * Stop recording and save analysis data
   */
  async stopRecording(): Promise<string> {
    if (!this.isRecording) {
      logger.warn('Analyzer is not currently recording');
      return '';
    }

    this.isRecording = false;
    this.session.endTime = Date.now();

    logger.info('🛑 Stopping network analysis recording');

    try {
      // Record final page state
      await this.recordPageState('recording-end');

      // Save analysis data
      const filename = await this.saveAnalysisData();
      
      logger.info(`📊 Analysis data saved: ${filename}`);
      return filename;
    } catch (error) {
      logger.error('Failed to stop recording', error as Error);
      throw error;
    }
  }

  /**
   * Record current page state
   */
  async recordPageState(eventType: string): Promise<void> {
    try {
      // Get current URL and title
      const urlResult = await this.client.send('Runtime.evaluate', {
        expression: 'window.location.href',
        returnByValue: true
      });

      const titleResult = await this.client.send('Runtime.evaluate', {
        expression: 'document.title',
        returnByValue: true
      });

      // Get cookies
      const cookiesResult = await this.client.send('Network.getCookies');
      this.session.cookies = cookiesResult.cookies;

      // Get localStorage
      const localStorageResult = await this.client.send('Runtime.evaluate', {
        expression: 'JSON.stringify(localStorage)',
        returnByValue: true
      });

      if (localStorageResult.result.value) {
        this.session.localStorage = JSON.parse(localStorageResult.result.value);
      }

      // Get sessionStorage
      const sessionStorageResult = await this.client.send('Runtime.evaluate', {
        expression: 'JSON.stringify(sessionStorage)',
        returnByValue: true
      });

      if (sessionStorageResult.result.value) {
        this.session.sessionStorage = JSON.parse(sessionStorageResult.result.value);
      }

      // Record page event
      this.session.pageEvents.push({
        type: 'user-action',
        url: urlResult.result.value,
        title: titleResult.result.value,
        timestamp: Date.now(),
        details: { eventType }
      });

      logger.debug(`📍 Recorded page state: ${eventType}`, undefined, {
        url: urlResult.result.value,
        title: titleResult.result.value
      });

    } catch (error) {
      logger.debug('Failed to record page state', undefined, { error: (error as Error).message });
    }
  }

  /**
   * Setup CDP event listeners
   */
  private setupEventListeners(): void {
    // Network request events
    this.client.on('Network.requestWillBeSent', (params: any) => {
      if (!this.isRecording) return;

      const request: NetworkRequest = {
        requestId: params.requestId,
        url: params.request.url,
        method: params.request.method,
        headers: params.request.headers,
        postData: params.request.postData,
        timestamp: params.timestamp,
        resourceType: params.type
      };

      this.session.requests.push(request);
      
      // Log important requests
      if (this.isImportantRequest(request)) {
        logger.debug(`🌐 Request: ${request.method} ${request.url}`, this.session.projectNumber);
      }
    });

    // Network response events
    this.client.on('Network.responseReceived', (params: any) => {
      if (!this.isRecording) return;

      const response: NetworkResponse = {
        requestId: params.requestId,
        url: params.response.url,
        status: params.response.status,
        statusText: params.response.statusText,
        headers: params.response.headers,
        timestamp: params.timestamp,
        mimeType: params.response.mimeType
      };

      this.session.responses.push(response);

      // Log important responses
      if (this.isImportantResponse(response)) {
        logger.debug(`📥 Response: ${response.status} ${response.url}`, this.session.projectNumber);
      }

      // Capture response body for important requests
      if (this.shouldCaptureResponseBody(response)) {
        this.captureResponseBody(params.requestId, response);
      }
    });

    // Page navigation events
    this.client.on('Page.frameNavigated', (params: any) => {
      if (!this.isRecording) return;

      this.session.pageEvents.push({
        type: 'navigation',
        url: params.frame.url,
        title: params.frame.name || '',
        timestamp: Date.now(),
        details: { frameId: params.frame.id }
      });

      logger.debug(`🧭 Navigation: ${params.frame.url}`, this.session.projectNumber);
    });

    // Security state changes
    this.client.on('Security.securityStateChanged', (params: any) => {
      if (!this.isRecording) return;

      logger.debug(`🔒 Security state: ${params.securityState}`, this.session.projectNumber, {
        securityState: params.securityState
      });
    });
  }

  /**
   * Check if request is important for analysis
   */
  private isImportantRequest(request: NetworkRequest): boolean {
    const url = request.url.toLowerCase();
    
    // ESF portal requests
    if (url.includes('esf.gov.cz')) return true;
    
    // Identity portal requests
    if (url.includes('identita.gov.cz')) return true;
    
    // PDF downloads
    if (url.includes('.pdf') || request.headers['accept']?.includes('application/pdf')) return true;
    
    // API calls
    if (url.includes('/api/') || url.includes('/rest/')) return true;
    
    // Authentication related
    if (url.includes('login') || url.includes('auth') || url.includes('oauth')) return true;
    
    return false;
  }

  /**
   * Check if response is important for analysis
   */
  private isImportantResponse(response: NetworkResponse): boolean {
    // Error responses
    if (response.status >= 400) return true;
    
    // Redirects
    if (response.status >= 300 && response.status < 400) return true;
    
    // PDF files
    if (response.mimeType?.includes('application/pdf')) return true;
    
    // JSON responses from ESF/Identity portals
    if (response.mimeType?.includes('application/json') && 
        (response.url.includes('esf.gov.cz') || response.url.includes('identita.gov.cz'))) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if response body should be captured
   */
  private shouldCaptureResponseBody(response: NetworkResponse): boolean {
    // Capture JSON responses from important domains
    if (response.mimeType?.includes('application/json') && 
        (response.url.includes('esf.gov.cz') || response.url.includes('identita.gov.cz'))) {
      return true;
    }
    
    // Capture HTML for important pages
    if (response.mimeType?.includes('text/html') && response.status === 200 &&
        (response.url.includes('esf.gov.cz') || response.url.includes('identita.gov.cz'))) {
      return true;
    }
    
    return false;
  }

  /**
   * Capture response body
   */
  private async captureResponseBody(requestId: string, response: NetworkResponse): Promise<void> {
    try {
      const bodyResult = await this.client.send('Network.getResponseBody', { requestId });
      
      if (bodyResult.body) {
        response.responseBody = bodyResult.base64Encoded ? 
          Buffer.from(bodyResult.body, 'base64').toString('utf-8') : 
          bodyResult.body;
      }
    } catch (error) {
      // Response body might not be available for all requests
      logger.debug(`Could not capture response body for ${response.url}`, undefined, {
        error: (error as Error).message
      });
    }
  }

  /**
   * Save analysis data to file
   */
  private async saveAnalysisData(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectSuffix = this.session.projectNumber ? `_projekt_${this.session.projectNumber}` : '';
    const filename = `esf_analysis_${timestamp}${projectSuffix}.json`;
    const filepath = path.join(this.outputDir, filename);

    // Ensure output directory exists
    await import('fs/promises').then(fs => fs.mkdir(this.outputDir, { recursive: true }));

    // Prepare analysis summary
    const summary = {
      session: this.session,
      statistics: {
        duration: this.session.endTime ? this.session.endTime - this.session.startTime : 0,
        totalRequests: this.session.requests.length,
        totalResponses: this.session.responses.length,
        totalPageEvents: this.session.pageEvents.length,
        uniqueDomains: [...new Set(this.session.requests.map(r => new URL(r.url).hostname))],
        pdfRequests: this.session.requests.filter(r => 
          r.url.includes('.pdf') || r.headers['accept']?.includes('application/pdf')
        ).length,
        authenticationEvents: this.session.pageEvents.filter(e => 
          e.url.includes('identita.gov.cz') || e.url.includes('login')
        ).length
      }
    };

    await writeFile(filepath, JSON.stringify(summary, null, 2), 'utf-8');
    
    return filename;
  }

  /**
   * Add manual marker to the recording
   */
  async addMarker(description: string, details?: any): Promise<void> {
    if (!this.isRecording) return;

    await this.recordPageState(description);
    
    this.session.pageEvents.push({
      type: 'user-action',
      url: await this.getCurrentUrl(),
      title: await this.getCurrentTitle(),
      timestamp: Date.now(),
      details: { marker: description, ...details }
    });

    logger.info(`📍 Manual marker: ${description}`, this.session.projectNumber);
  }

  /**
   * Get current URL
   */
  private async getCurrentUrl(): Promise<string> {
    try {
      const result = await this.client.send('Runtime.evaluate', {
        expression: 'window.location.href',
        returnByValue: true
      });
      return result.result.value;
    } catch {
      return '';
    }
  }

  /**
   * Get current page title
   */
  private async getCurrentTitle(): Promise<string> {
    try {
      const result = await this.client.send('Runtime.evaluate', {
        expression: 'document.title',
        returnByValue: true
      });
      return result.result.value;
    } catch {
      return '';
    }
  }

  /**
   * Get current recording status
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current session data
   */
  getCurrentSession(): AnalysisSession {
    return { ...this.session };
  }
}