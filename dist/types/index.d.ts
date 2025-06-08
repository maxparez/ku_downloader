export interface AppConfig {
    projects: string[];
    inputFile?: string;
    outputDir: string;
    createProjectDirs: boolean;
    rateLimit: number;
    retryAttempts: number;
    timeout: number;
    chromePort: number;
    chromePath?: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logToFile: boolean;
    verbose: boolean;
    dryRun: boolean;
}
export interface ProgressEvent {
    type: 'project-start' | 'download-progress' | 'project-complete';
    projectNumber: string;
    progress?: {
        current: number;
        total: number;
        percentage: number;
    };
    data?: any;
}
export interface ErrorEvent {
    type: 'validation-error' | 'network-error' | 'auth-error' | 'file-error';
    message: string;
    projectNumber?: string;
    error?: Error;
}
export interface StatusEvent {
    type: 'session-status' | 'engine-status';
    status: 'connected' | 'disconnected' | 'idle' | 'working';
    data?: any;
}
export type AppEvent = ProgressEvent | ErrorEvent | StatusEvent;
export interface ProjectInfo {
    number: string;
    normalizedNumber: string;
    url: string;
    status: 'pending' | 'downloading' | 'completed' | 'error';
}
export interface ProjectMetadata {
    projectNumber: string;
    downloadDate: string;
    totalCards: number;
    successfulDownloads: number;
    errors: string[];
    session: {
        startTime: string;
        endTime?: string;
    };
}
export interface DownloadResult {
    projectNumber: string;
    success: boolean;
    filesDownloaded: number;
    totalFiles: number;
    errors: string[];
    metadata: ProjectMetadata;
}
export interface DownloadOptions {
    projectNumber: string;
    outputDir: string;
    rateLimit: number;
    retryAttempts: number;
}
export interface SessionInfo {
    isConnected: boolean;
    isAuthenticated: boolean;
    chromePort: number;
    sessionId?: string;
    startTime: Date;
    lastActivity: Date;
}
export interface FileInfo {
    name: string;
    path: string;
    url: string;
    size?: number;
    downloaded: boolean;
    error?: string;
}
export interface CLIArgs {
    projects?: string[];
    file?: string;
    output?: string;
    verbose?: boolean;
    rateLimit?: number;
    retry?: number;
    dryRun?: boolean;
}
export interface ValidationResult {
    isValid: boolean;
    value?: string;
    error?: string;
}
export interface ChromeConnection {
    port: number;
    host: string;
    webSocketDebuggerUrl: string;
    isConnected: boolean;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    projectNumber?: string;
    data?: any;
}
export interface ESFProjectUrl {
    baseUrl: string;
    projectPath: string;
    fullUrl: string;
}
export interface ESFCardInfo {
    cardNumber: number;
    fileName: string;
    downloadUrl: string;
    participantName?: string;
}
export declare class ESFError extends Error {
    type: ErrorEvent['type'];
    projectNumber?: string | undefined;
    originalError?: Error | undefined;
    constructor(message: string, type: ErrorEvent['type'], projectNumber?: string | undefined, originalError?: Error | undefined);
}
export declare class ValidationError extends ESFError {
    constructor(message: string, projectNumber?: string);
}
export declare class NetworkError extends ESFError {
    constructor(message: string, projectNumber?: string, originalError?: Error);
}
export declare class AuthError extends ESFError {
    constructor(message: string);
}
export declare class FileError extends ESFError {
    constructor(message: string, projectNumber?: string, originalError?: Error);
}
export interface CDPClient {
    send(method: string, params?: any): Promise<any>;
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    close(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map