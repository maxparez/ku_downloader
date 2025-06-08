import type { AppConfig, CLIArgs, ValidationResult } from '../types/index';
/**
 * Configuration Manager for ESF Downloader
 * Handles loading and merging configuration from multiple sources
 */
export declare class ConfigManager {
    private static readonly CONFIG_FILE_NAME;
    /**
     * Create configuration from CLI arguments
     */
    static fromCLI(args: CLIArgs): AppConfig;
    /**
     * Create configuration from environment variables
     */
    static fromEnvironment(): Partial<AppConfig>;
    /**
     * Load configuration from file
     */
    static fromFile(filePath?: string): Promise<Partial<AppConfig>>;
    /**
     * Save configuration to file
     */
    static saveToFile(config: AppConfig, filePath?: string): Promise<void>;
    /**
     * Create complete configuration from all sources
     * Priority: CLI args > Environment > Config file > Defaults
     */
    static createConfig(cliArgs?: CLIArgs, configFilePath?: string): Promise<AppConfig>;
    /**
     * Merge multiple configuration objects
     * Later objects override earlier ones
     */
    static merge(...configs: Partial<AppConfig>[]): AppConfig;
    /**
     * Validate complete configuration
     */
    static validate(config: AppConfig): ValidationResult;
    /**
     * Validate partial configuration (for loading from files)
     */
    static validatePartialConfig(config: any): ValidationResult;
    /**
     * Parse environment variable value to appropriate type
     */
    private static parseEnvValue;
    /**
     * Get configuration file path in home directory
     */
    static getHomeConfigPath(): string;
    /**
     * Check if configuration file exists
     */
    static configFileExists(filePath?: string): Promise<boolean>;
    /**
     * Create a configuration template file
     */
    static createTemplate(filePath?: string): Promise<void>;
}
//# sourceMappingURL=ConfigManager.d.ts.map