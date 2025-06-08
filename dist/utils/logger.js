import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { LOGGING_CONFIG } from '../config/defaults.js';
/**
 * Logger utility for ESF Downloader
 * Provides structured logging with Winston
 */
export class Logger {
    static instance;
    winston;
    logLevel;
    constructor(logLevel = 'info', logToFile = true) {
        this.logLevel = logLevel;
        this.winston = this.createWinstonLogger(logLevel, logToFile);
    }
    /**
     * Get singleton logger instance
     */
    static getInstance(logLevel, logToFile) {
        if (!Logger.instance) {
            Logger.instance = new Logger(logLevel, logToFile);
        }
        return Logger.instance;
    }
    /**
     * Create Winston logger configuration
     */
    createWinstonLogger(logLevel, logToFile) {
        const transports = [];
        // Console transport
        transports.push(new winston.transports.Console({
            level: logLevel,
            format: winston.format.combine(winston.format.colorize(), winston.format.timestamp({ format: LOGGING_CONFIG.DATE_FORMAT }), winston.format.printf(({ timestamp, level, message, projectNumber, ...meta }) => {
                const projectPrefix = projectNumber ? `[${projectNumber}] ` : '';
                const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} ${level}: ${projectPrefix}${message}${metaStr}`;
            }))
        }));
        // File transport
        if (logToFile) {
            // Ensure log directory exists
            if (!fs.existsSync(LOGGING_CONFIG.LOG_DIR)) {
                fs.mkdirSync(LOGGING_CONFIG.LOG_DIR, { recursive: true });
            }
            // Main log file
            transports.push(new winston.transports.File({
                filename: path.join(LOGGING_CONFIG.LOG_DIR, 'esf-downloader.log'),
                level: logLevel,
                maxsize: LOGGING_CONFIG.MAX_LOG_SIZE,
                maxFiles: LOGGING_CONFIG.MAX_LOG_FILES,
                format: winston.format.combine(winston.format.timestamp({ format: LOGGING_CONFIG.DATE_FORMAT }), winston.format.json())
            }));
            // Error log file
            transports.push(new winston.transports.File({
                filename: path.join(LOGGING_CONFIG.LOG_DIR, 'esf-downloader-error.log'),
                level: 'error',
                maxsize: LOGGING_CONFIG.MAX_LOG_SIZE,
                maxFiles: LOGGING_CONFIG.MAX_LOG_FILES,
                format: winston.format.combine(winston.format.timestamp({ format: LOGGING_CONFIG.DATE_FORMAT }), winston.format.json())
            }));
        }
        return winston.createLogger({
            level: logLevel,
            format: winston.format.combine(winston.format.errors({ stack: true }), winston.format.timestamp({ format: LOGGING_CONFIG.DATE_FORMAT })),
            transports,
            // Handle uncaught exceptions
            exceptionHandlers: logToFile ? [
                new winston.transports.File({
                    filename: path.join(LOGGING_CONFIG.LOG_DIR, 'esf-downloader-exceptions.log')
                })
            ] : [],
            // Handle unhandled promise rejections
            rejectionHandlers: logToFile ? [
                new winston.transports.File({
                    filename: path.join(LOGGING_CONFIG.LOG_DIR, 'esf-downloader-rejections.log')
                })
            ] : []
        });
    }
    /**
     * Log debug message
     */
    debug(message, projectNumber, data) {
        this.winston.debug(message, { projectNumber, ...data });
    }
    /**
     * Log info message
     */
    info(message, projectNumber, data) {
        this.winston.info(message, { projectNumber, ...data });
    }
    /**
     * Log warning message
     */
    warn(message, projectNumber, data) {
        this.winston.warn(message, { projectNumber, ...data });
    }
    /**
     * Log error message
     */
    error(message, error, projectNumber, data) {
        this.winston.error(message, {
            projectNumber,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined,
            ...data
        });
    }
    /**
     * Log structured entry
     */
    logEntry(entry) {
        const { level, message, timestamp, projectNumber, data } = entry;
        this.winston.log(level, message, {
            timestamp: timestamp.toISOString(),
            projectNumber,
            ...data
        });
    }
    /**
     * Log project start
     */
    projectStart(projectNumber, data) {
        this.info(`Starting project processing`, projectNumber, data);
    }
    /**
     * Log project complete
     */
    projectComplete(projectNumber, filesDownloaded, totalFiles, data) {
        this.info(`Project completed: ${filesDownloaded}/${totalFiles} files downloaded`, projectNumber, {
            filesDownloaded,
            totalFiles,
            ...data
        });
    }
    /**
     * Log download progress
     */
    downloadProgress(projectNumber, current, total, fileName) {
        const percentage = Math.round((current / total) * 100);
        this.debug(`Download progress: ${current}/${total} (${percentage}%)`, projectNumber, {
            current,
            total,
            percentage,
            fileName
        });
    }
    /**
     * Log session events
     */
    sessionConnected(chromePort) {
        this.info(`Connected to Chrome debug session`, undefined, { chromePort });
    }
    sessionDisconnected() {
        this.warn(`Disconnected from Chrome debug session`);
    }
    sessionAuthRequired() {
        this.warn(`Authentication required - please login manually`);
    }
    /**
     * Log validation errors
     */
    validationError(message, projectNumber, details) {
        this.error(`Validation error: ${message}`, undefined, projectNumber, details);
    }
    /**
     * Log network errors
     */
    networkError(message, error, projectNumber, details) {
        this.error(`Network error: ${message}`, error, projectNumber, details);
    }
    /**
     * Log file operations
     */
    fileCreated(filePath, size) {
        this.debug(`File created: ${filePath}`, undefined, { filePath, size });
    }
    fileError(message, filePath, error) {
        this.error(`File error: ${message}`, error, undefined, { filePath });
    }
    /**
     * Update log level
     */
    setLogLevel(level) {
        this.logLevel = level;
        this.winston.level = level;
        this.info(`Log level changed to: ${level}`);
    }
    /**
     * Get current log level
     */
    getLogLevel() {
        return this.logLevel;
    }
    /**
     * Flush all log transports
     */
    async flush() {
        return new Promise((resolve) => {
            this.winston.on('finish', resolve);
            this.winston.end();
        });
    }
    /**
     * Create child logger with project context
     */
    createProjectLogger(projectNumber) {
        return new ProjectLogger(this, projectNumber);
    }
}
/**
 * Project-specific logger that automatically includes project number
 */
export class ProjectLogger {
    logger;
    projectNumber;
    constructor(logger, projectNumber) {
        this.logger = logger;
        this.projectNumber = projectNumber;
    }
    debug(message, data) {
        this.logger.debug(message, this.projectNumber, data);
    }
    info(message, data) {
        this.logger.info(message, this.projectNumber, data);
    }
    warn(message, data) {
        this.logger.warn(message, this.projectNumber, data);
    }
    error(message, error, data) {
        this.logger.error(message, error, this.projectNumber, data);
    }
    downloadProgress(current, total, fileName) {
        this.logger.downloadProgress(this.projectNumber, current, total, fileName);
    }
    complete(filesDownloaded, totalFiles, data) {
        this.logger.projectComplete(this.projectNumber, filesDownloaded, totalFiles, data);
    }
}
// Export singleton instance
export const logger = Logger.getInstance();
//# sourceMappingURL=logger.js.map