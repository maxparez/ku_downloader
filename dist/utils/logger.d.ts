import type { LogLevel, LogEntry } from '../types/index.js';
/**
 * Logger utility for ESF Downloader
 * Provides structured logging with Winston
 */
export declare class Logger {
    private static instance;
    private winston;
    private logLevel;
    private constructor();
    /**
     * Get singleton logger instance
     */
    static getInstance(logLevel?: LogLevel, logToFile?: boolean): Logger;
    /**
     * Create Winston logger configuration
     */
    private createWinstonLogger;
    /**
     * Log debug message
     */
    debug(message: string, projectNumber?: string, data?: any): void;
    /**
     * Log info message
     */
    info(message: string, projectNumber?: string, data?: any): void;
    /**
     * Log warning message
     */
    warn(message: string, projectNumber?: string, data?: any): void;
    /**
     * Log error message
     */
    error(message: string, error?: Error, projectNumber?: string, data?: any): void;
    /**
     * Log structured entry
     */
    logEntry(entry: LogEntry): void;
    /**
     * Log project start
     */
    projectStart(projectNumber: string, data?: any): void;
    /**
     * Log project complete
     */
    projectComplete(projectNumber: string, filesDownloaded: number, totalFiles: number, data?: any): void;
    /**
     * Log download progress
     */
    downloadProgress(projectNumber: string, current: number, total: number, fileName?: string): void;
    /**
     * Log session events
     */
    sessionConnected(chromePort: number): void;
    sessionDisconnected(): void;
    sessionAuthRequired(): void;
    /**
     * Log validation errors
     */
    validationError(message: string, projectNumber?: string, details?: any): void;
    /**
     * Log network errors
     */
    networkError(message: string, error?: Error, projectNumber?: string, details?: any): void;
    /**
     * Log file operations
     */
    fileCreated(filePath: string, size?: number): void;
    fileError(message: string, filePath: string, error?: Error): void;
    /**
     * Update log level
     */
    setLogLevel(level: LogLevel): void;
    /**
     * Get current log level
     */
    getLogLevel(): LogLevel;
    /**
     * Flush all log transports
     */
    flush(): Promise<void>;
    /**
     * Create child logger with project context
     */
    createProjectLogger(projectNumber: string): ProjectLogger;
}
/**
 * Project-specific logger that automatically includes project number
 */
export declare class ProjectLogger {
    private logger;
    private projectNumber;
    constructor(logger: Logger, projectNumber: string);
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error, data?: any): void;
    downloadProgress(current: number, total: number, fileName?: string): void;
    complete(filesDownloaded: number, totalFiles: number, data?: any): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map