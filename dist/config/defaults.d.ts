import type { AppConfig } from '../types/index.js';
/**
 * Default configuration values for ESF Downloader
 */
export declare const DEFAULT_CONFIG: AppConfig;
/**
 * Environment variable mappings
 */
export declare const ENV_MAPPINGS: Record<string, keyof AppConfig>;
/**
 * ESF Portal configuration
 */
export declare const ESF_CONFIG: {
    readonly BASE_URL: "https://esf.gov.cz";
    readonly PROJECT_PATH_TEMPLATE: "/projekty/CZ.02.02.XX/00/24_034/{projectNumber}/ucastnici";
    readonly LOGIN_URL: "https://identita.gov.cz";
    readonly MAX_CARDS_PER_PROJECT: 30;
    readonly DEFAULT_CARDS_PER_PROJECT: 15;
};
/**
 * Chrome configuration
 */
export declare const CHROME_CONFIG: {
    readonly DEFAULT_PORT: 9222;
    readonly DEFAULT_HOST: "localhost";
    readonly DEBUG_ENDPOINT: "/json/version";
    readonly CONNECTION_TIMEOUT: 10000;
    readonly RECONNECT_ATTEMPTS: 5;
    readonly RECONNECT_DELAY: 2000;
};
/**
 * Logging configuration
 */
export declare const LOGGING_CONFIG: {
    readonly LOG_DIR: "./logs";
    readonly MAX_LOG_SIZE: number;
    readonly MAX_LOG_FILES: 5;
    readonly DATE_FORMAT: "YYYY-MM-DD HH:mm:ss";
    readonly LOG_FILE_PATTERN: "esf-downloader-%DATE%.log";
};
//# sourceMappingURL=defaults.d.ts.map