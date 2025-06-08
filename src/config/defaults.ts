import type { AppConfig } from '../types/index.js';

/**
 * Default configuration values for ESF Downloader
 */
export const DEFAULT_CONFIG: AppConfig = {
  // Project settings
  projects: [],
  inputFile: undefined,
  
  // Output settings
  outputDir: './downloads',
  createProjectDirs: true,
  
  // Network settings
  rateLimit: 1000, // 1 second between requests
  retryAttempts: 3,
  timeout: 30000, // 30 seconds
  
  // Chrome settings
  chromePort: 9222,
  chromePath: undefined, // Auto-detect
  
  // Logging settings
  logLevel: 'info',
  logToFile: true,
  
  // UI settings
  verbose: false,
  dryRun: false
};

/**
 * Environment variable mappings
 */
export const ENV_MAPPINGS: Record<string, keyof AppConfig> = {
  ESF_OUTPUT_DIR: 'outputDir',
  ESF_CHROME_PORT: 'chromePort',
  ESF_CHROME_PATH: 'chromePath',
  ESF_RATE_LIMIT: 'rateLimit',
  ESF_RETRY_ATTEMPTS: 'retryAttempts',
  ESF_TIMEOUT: 'timeout',
  ESF_LOG_LEVEL: 'logLevel',
  ESF_LOG_TO_FILE: 'logToFile',
  ESF_VERBOSE: 'verbose',
  ESF_DRY_RUN: 'dryRun'
};

/**
 * ESF Portal configuration
 */
export const ESF_CONFIG = {
  BASE_URL: 'https://esf.gov.cz',
  PROJECT_PATH_TEMPLATE: '/projekty/CZ.02.02.XX/00/24_034/{projectNumber}/ucastnici',
  LOGIN_URL: 'https://identita.gov.cz',
  MAX_CARDS_PER_PROJECT: 30,
  DEFAULT_CARDS_PER_PROJECT: 15
} as const;

/**
 * Chrome configuration
 */
export const CHROME_CONFIG = {
  DEFAULT_PORT: 9222,
  DEFAULT_HOST: 'localhost',
  DEBUG_ENDPOINT: '/json/version',
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000 // 2 seconds
} as const;

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
  LOG_DIR: './logs',
  MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_LOG_FILES: 5,
  DATE_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  LOG_FILE_PATTERN: 'esf-downloader-%DATE%.log'
} as const;