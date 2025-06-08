import fs from 'fs/promises';
import path from 'path';
import type { AppConfig, CLIArgs, ValidationResult } from '../types/index.js';
import { DEFAULT_CONFIG, ENV_MAPPINGS } from './defaults.js';

/**
 * Configuration Manager for ESF Downloader
 * Handles loading and merging configuration from multiple sources
 */
export class ConfigManager {
  private static readonly CONFIG_FILE_NAME = '.esf-downloader.json';

  /**
   * Create configuration from CLI arguments
   */
  static fromCLI(args: CLIArgs): AppConfig {
    const config: Partial<AppConfig> = {
      projects: args.projects || [],
      inputFile: args.file,
      outputDir: args.output,
      verbose: args.verbose,
      rateLimit: args.rateLimit,
      retryAttempts: args.retry,
      dryRun: args.dryRun
    };

    return this.merge(DEFAULT_CONFIG, config);
  }

  /**
   * Create configuration from environment variables
   */
  static fromEnvironment(): Partial<AppConfig> {
    const config: Partial<AppConfig> = {};

    for (const [envVar, configKey] of Object.entries(ENV_MAPPINGS)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        config[configKey] = this.parseEnvValue(value, configKey);
      }
    }

    return config;
  }

  /**
   * Load configuration from file
   */
  static async fromFile(filePath?: string): Promise<Partial<AppConfig>> {
    const configPath = filePath || this.CONFIG_FILE_NAME;
    
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      const validation = this.validatePartialConfig(parsed);
      if (!validation.isValid) {
        throw new Error(`Invalid config file: ${validation.error}`);
      }
      
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config file doesn't exist, return empty config
        return {};
      }
      throw error;
    }
  }

  /**
   * Save configuration to file
   */
  static async saveToFile(config: AppConfig, filePath?: string): Promise<void> {
    const configPath = filePath || this.CONFIG_FILE_NAME;
    const validation = this.validate(config);
    
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.error}`);
    }

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Create complete configuration from all sources
   * Priority: CLI args > Environment > Config file > Defaults
   */
  static async createConfig(cliArgs?: CLIArgs, configFilePath?: string): Promise<AppConfig> {
    const envConfig = this.fromEnvironment();
    const fileConfig = await this.fromFile(configFilePath);
    const cliConfig = cliArgs ? this.fromCLI(cliArgs) : {};

    return this.merge(DEFAULT_CONFIG, fileConfig, envConfig, cliConfig);
  }

  /**
   * Merge multiple configuration objects
   * Later objects override earlier ones
   */
  static merge(...configs: Partial<AppConfig>[]): AppConfig {
    const result = { ...DEFAULT_CONFIG };

    for (const config of configs) {
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined) {
          (result as any)[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Validate complete configuration
   */
  static validate(config: AppConfig): ValidationResult {
    try {
      // Check required fields
      if (!Array.isArray(config.projects)) {
        return { isValid: false, error: 'projects must be an array' };
      }

      if (typeof config.outputDir !== 'string' || config.outputDir.trim() === '') {
        return { isValid: false, error: 'outputDir must be a non-empty string' };
      }

      // Validate numeric fields
      if (typeof config.rateLimit !== 'number' || config.rateLimit < 0) {
        return { isValid: false, error: 'rateLimit must be a non-negative number' };
      }

      if (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0) {
        return { isValid: false, error: 'retryAttempts must be a non-negative number' };
      }

      if (typeof config.timeout !== 'number' || config.timeout <= 0) {
        return { isValid: false, error: 'timeout must be a positive number' };
      }

      if (typeof config.chromePort !== 'number' || config.chromePort <= 0 || config.chromePort > 65535) {
        return { isValid: false, error: 'chromePort must be a valid port number' };
      }

      // Validate enum fields
      const validLogLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLogLevels.includes(config.logLevel)) {
        return { isValid: false, error: `logLevel must be one of: ${validLogLevels.join(', ')}` };
      }

      // Validate boolean fields
      const booleanFields = ['createProjectDirs', 'logToFile', 'verbose', 'dryRun'];
      for (const field of booleanFields) {
        if (typeof (config as any)[field] !== 'boolean') {
          return { isValid: false, error: `${field} must be a boolean` };
        }
      }

      return { isValid: true, value: JSON.stringify(config) };
    } catch (error) {
      return { isValid: false, error: `Validation error: ${(error as Error).message}` };
    }
  }

  /**
   * Validate partial configuration (for loading from files)
   */
  static validatePartialConfig(config: any): ValidationResult {
    if (typeof config !== 'object' || config === null) {
      return { isValid: false, error: 'Configuration must be an object' };
    }

    // Validate each field that exists
    for (const [key, value] of Object.entries(config)) {
      if (!(key in DEFAULT_CONFIG)) {
        return { isValid: false, error: `Unknown configuration key: ${key}` };
      }

      // Type validation based on default values
      const defaultValue = (DEFAULT_CONFIG as any)[key];
      if (typeof value !== typeof defaultValue && value !== null && value !== undefined) {
        return { isValid: false, error: `Invalid type for ${key}: expected ${typeof defaultValue}, got ${typeof value}` };
      }
    }

    return { isValid: true };
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private static parseEnvValue(value: string, key: keyof AppConfig): any {
    const defaultValue = DEFAULT_CONFIG[key];

    switch (typeof defaultValue) {
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'number':
        const parsed = Number(value);
        return isNaN(parsed) ? defaultValue : parsed;
      case 'object':
        if (Array.isArray(defaultValue)) {
          return value.split(',').map(v => v.trim());
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Get configuration file path in home directory
   */
  static getHomeConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    return path.join(homeDir, this.CONFIG_FILE_NAME);
  }

  /**
   * Check if configuration file exists
   */
  static async configFileExists(filePath?: string): Promise<boolean> {
    const configPath = filePath || this.CONFIG_FILE_NAME;
    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a configuration template file
   */
  static async createTemplate(filePath?: string): Promise<void> {
    const configPath = filePath || this.CONFIG_FILE_NAME;
    const template = {
      ...DEFAULT_CONFIG,
      projects: ["9356", "7890"],
      outputDir: "./downloads",
      verbose: true
    };

    await this.saveToFile(template, configPath);
  }
}