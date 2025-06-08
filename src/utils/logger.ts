import winston from 'winston';
import path from 'path';
import fs from 'fs';
import type { LogLevel, LogEntry } from '../types/index.js';
import { LOGGING_CONFIG } from '../config/defaults.js';

/**
 * Logger utility for ESF Downloader
 * Provides structured logging with Winston
 */
export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;
  private logLevel: LogLevel;

  private constructor(logLevel: LogLevel = 'info', logToFile: boolean = true) {
    this.logLevel = logLevel;
    this.winston = this.createWinstonLogger(logLevel, logToFile);
  }

  /**
   * Get singleton logger instance
   */
  static getInstance(logLevel?: LogLevel, logToFile?: boolean): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(logLevel, logToFile);
    }
    return Logger.instance;
  }

  /**
   * Create Winston logger configuration
   */
  private createWinstonLogger(logLevel: LogLevel, logToFile: boolean): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: LOGGING_CONFIG.DATE_FORMAT }),
          winston.format.printf(({ timestamp, level, message, projectNumber, ...meta }) => {
            const projectPrefix = projectNumber ? `[${projectNumber}] ` : '';
            const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level}: ${projectPrefix}${message}${metaStr}`;
          })
        )
      })
    );

    // File transport
    if (logToFile) {
      // Ensure log directory exists
      if (!fs.existsSync(LOGGING_CONFIG.LOG_DIR)) {
        fs.mkdirSync(LOGGING_CONFIG.LOG_DIR, { recursive: true });
      }

      // Main log file
      transports.push(
        new winston.transports.File({
          filename: path.join(LOGGING_CONFIG.LOG_DIR, 'esf-downloader.log'),
          level: logLevel,
          maxsize: LOGGING_CONFIG.MAX_LOG_SIZE,
          maxFiles: LOGGING_CONFIG.MAX_LOG_FILES,
          format: winston.format.combine(
            winston.format.timestamp({ format: LOGGING_CONFIG.DATE_FORMAT }),
            winston.format.json()
          )
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(LOGGING_CONFIG.LOG_DIR, 'esf-downloader-error.log'),
          level: 'error',
          maxsize: LOGGING_CONFIG.MAX_LOG_SIZE,
          maxFiles: LOGGING_CONFIG.MAX_LOG_FILES,
          format: winston.format.combine(
            winston.format.timestamp({ format: LOGGING_CONFIG.DATE_FORMAT }),
            winston.format.json()
          )
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp({ format: LOGGING_CONFIG.DATE_FORMAT })
      ),
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
  debug(message: string, projectNumber?: string, data?: any): void {
    this.winston.debug(message, { projectNumber, ...data });
  }

  /**
   * Log info message
   */
  info(message: string, projectNumber?: string, data?: any): void {
    this.winston.info(message, { projectNumber, ...data });
  }

  /**
   * Log warning message
   */
  warn(message: string, projectNumber?: string, data?: any): void {
    this.winston.warn(message, { projectNumber, ...data });
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, projectNumber?: string, data?: any): void {
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
  logEntry(entry: LogEntry): void {
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
  projectStart(projectNumber: string, data?: any): void {
    this.info(`Starting project processing`, projectNumber, data);
  }

  /**
   * Log project complete
   */
  projectComplete(projectNumber: string, filesDownloaded: number, totalFiles: number, data?: any): void {
    this.info(`Project completed: ${filesDownloaded}/${totalFiles} files downloaded`, projectNumber, {
      filesDownloaded,
      totalFiles,
      ...data
    });
  }

  /**
   * Log download progress
   */
  downloadProgress(projectNumber: string, current: number, total: number, fileName?: string): void {
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
  sessionConnected(chromePort: number): void {
    this.info(`Connected to Chrome debug session`, undefined, { chromePort });
  }

  sessionDisconnected(): void {
    this.warn(`Disconnected from Chrome debug session`);
  }

  sessionAuthRequired(): void {
    this.warn(`Authentication required - please login manually`);
  }

  /**
   * Log validation errors
   */
  validationError(message: string, projectNumber?: string, details?: any): void {
    this.error(`Validation error: ${message}`, undefined, projectNumber, details);
  }

  /**
   * Log network errors
   */
  networkError(message: string, error?: Error, projectNumber?: string, details?: any): void {
    this.error(`Network error: ${message}`, error, projectNumber, details);
  }

  /**
   * Log file operations
   */
  fileCreated(filePath: string, size?: number): void {
    this.debug(`File created: ${filePath}`, undefined, { filePath, size });
  }

  fileError(message: string, filePath: string, error?: Error): void {
    this.error(`File error: ${message}`, error, undefined, { filePath });
  }

  /**
   * Update log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.winston.level = level;
    this.info(`Log level changed to: ${level}`);
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Flush all log transports
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }

  /**
   * Create child logger with project context
   */
  createProjectLogger(projectNumber: string): ProjectLogger {
    return new ProjectLogger(this, projectNumber);
  }
}

/**
 * Project-specific logger that automatically includes project number
 */
export class ProjectLogger {
  constructor(
    private logger: Logger,
    private projectNumber: string
  ) {}

  debug(message: string, data?: any): void {
    this.logger.debug(message, this.projectNumber, data);
  }

  info(message: string, data?: any): void {
    this.logger.info(message, this.projectNumber, data);
  }

  warn(message: string, data?: any): void {
    this.logger.warn(message, this.projectNumber, data);
  }

  error(message: string, error?: Error, data?: any): void {
    this.logger.error(message, error, this.projectNumber, data);
  }

  downloadProgress(current: number, total: number, fileName?: string): void {
    this.logger.downloadProgress(this.projectNumber, current, total, fileName);
  }

  complete(filesDownloaded: number, totalFiles: number, data?: any): void {
    this.logger.projectComplete(this.projectNumber, filesDownloaded, totalFiles, data);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();