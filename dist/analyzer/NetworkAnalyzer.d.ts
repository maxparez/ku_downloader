import type { CDPClient } from '../types/index.js';
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
export declare class NetworkAnalyzer {
    private client;
    private session;
    private isRecording;
    private outputDir;
    constructor(client: CDPClient, outputDir?: string);
    /**
     * Start recording network traffic and page events
     */
    startRecording(projectNumber?: string): Promise<void>;
    /**
     * Stop recording and save analysis data
     */
    stopRecording(): Promise<string>;
    /**
     * Record current page state
     */
    recordPageState(eventType: string): Promise<void>;
    /**
     * Setup CDP event listeners
     */
    private setupEventListeners;
    /**
     * Check if request is important for analysis
     */
    private isImportantRequest;
    /**
     * Check if response is important for analysis
     */
    private isImportantResponse;
    /**
     * Check if response body should be captured
     */
    private shouldCaptureResponseBody;
    /**
     * Capture response body
     */
    private captureResponseBody;
    /**
     * Save analysis data to file
     */
    private saveAnalysisData;
    /**
     * Add manual marker to the recording
     */
    addMarker(description: string, details?: any): Promise<void>;
    /**
     * Get current URL
     */
    private getCurrentUrl;
    /**
     * Get current page title
     */
    private getCurrentTitle;
    /**
     * Get current recording status
     */
    isCurrentlyRecording(): boolean;
    /**
     * Get current session data
     */
    getCurrentSession(): AnalysisSession;
}
//# sourceMappingURL=NetworkAnalyzer.d.ts.map