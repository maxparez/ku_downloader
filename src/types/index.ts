// Main type definitions for ESF Downloader

// Configuration Types
export interface AppConfig {
  // Project settings
  projects: string[];
  inputFile?: string;
  
  // Output settings
  outputDir: string;
  createProjectDirs: boolean;
  
  // Network settings
  rateLimit: number;
  retryAttempts: number;
  timeout: number;
  
  // Chrome settings
  chromePort: number;
  chromePath?: string;
  
  // Logging settings
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logToFile: boolean;
  
  // UI settings
  verbose: boolean;
  dryRun: boolean;
}

// Event Types
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

// Project Types
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

// Download Types
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

// Session Types
export interface SessionInfo {
  isConnected: boolean;
  isAuthenticated: boolean;
  chromePort: number;
  sessionId?: string;
  startTime: Date;
  lastActivity: Date;
}

// File Types
export interface FileInfo {
  name: string;
  path: string;
  url: string;
  size?: number;
  downloaded: boolean;
  error?: string;
}

// CLI Types
export interface CLIArgs {
  projects?: string[];
  file?: string;
  output?: string;
  verbose?: boolean;
  rateLimit?: number;
  retry?: number;
  dryRun?: boolean;
  help?: boolean;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  value?: string;
  error?: string;
}

// Chrome Types
export interface ChromeConnection {
  port: number;
  host: string;
  webSocketDebuggerUrl: string;
  isConnected: boolean;
}

// Logger Types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  projectNumber?: string;
  data?: any;
}

// ESF Portal Types
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

// Error Types
export class ESFError extends Error {
  constructor(
    message: string,
    public type: ErrorEvent['type'],
    public projectNumber?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ESFError';
  }
}

export class ValidationError extends ESFError {
  constructor(message: string, projectNumber?: string) {
    super(message, 'validation-error', projectNumber);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends ESFError {
  constructor(message: string, projectNumber?: string, originalError?: Error) {
    super(message, 'network-error', projectNumber, originalError);
    this.name = 'NetworkError';
  }
}

export class AuthError extends ESFError {
  constructor(message: string) {
    super(message, 'auth-error');
    this.name = 'AuthError';
  }
}

export class FileError extends ESFError {
  constructor(message: string, projectNumber?: string, originalError?: Error) {
    super(message, 'file-error', projectNumber, originalError);
    this.name = 'FileError';
  }
}

// Chrome Remote Interface types
export interface CDPClient {
  send(method: string, params?: any): Promise<any>;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  close(): Promise<void>;
}