#!/usr/bin/env node

import { CLIArgumentParser } from './args.js';
import { CLIProgressDisplay } from './progress.js';
import { DownloadEngine } from '../../core/DownloadEngine.js';
import { DEFAULT_CONFIG } from '../../config/defaults.js';
import type { AppConfig, CLIArgs } from '../../types/index.js';
import { ValidationError, NetworkError, AuthError } from '../../types/index.js';

/**
 * CLI Entry Point for ESF Downloader
 * Thin wrapper around core DownloadEngine with CLI-specific UI
 */
class ESFDownloaderCLI {
  private argumentParser: CLIArgumentParser;
  private progressDisplay: CLIProgressDisplay;
  private downloadEngine: DownloadEngine;
  private config: AppConfig;

  constructor() {
    this.argumentParser = new CLIArgumentParser();
    this.config = { ...DEFAULT_CONFIG };
    this.progressDisplay = new CLIProgressDisplay(this.config);
    this.downloadEngine = new DownloadEngine(this.config);
  }

  /**
   * Main CLI entry point
   */
  async run(argv: string[] = process.argv): Promise<void> {
    try {
      // Parse command line arguments
      const cliArgs = this.argumentParser.parse(argv);

      // Merge CLI args with default config
      this.mergeConfigWithArgs(cliArgs);

      // Validate environment before starting
      await this.validateEnvironment();

      // Setup event listeners for UI feedback
      this.setupEventListeners();

      // Initialize progress display
      const projectCount = this.config.projects.length;
      this.progressDisplay.initialize(projectCount);

      // Start download process
      const results = await this.downloadEngine.downloadProjects(this.config.projects);

      // Display final summary
      this.progressDisplay.displaySummary(results);

      // Exit with appropriate code
      const hasFailures = results.some(result => !result.success);
      process.exit(hasFailures ? 1 : 0);

    } catch (error) {
      this.handleError(error as Error);
      process.exit(1);
    }
  }

  /**
   * Merge CLI arguments with default configuration
   */
  private mergeConfigWithArgs(cliArgs: CLIArgs): void {
    // Update config with CLI arguments
    if (cliArgs.projects) {
      this.config.projects = cliArgs.projects;
    }

    if (cliArgs.output) {
      this.config.outputDir = cliArgs.output;
    }

    if (cliArgs.verbose !== undefined) {
      this.config.verbose = cliArgs.verbose;
      // Increase log level for verbose mode
      if (cliArgs.verbose) {
        this.config.logLevel = 'debug';
      }
    }

    if (cliArgs.rateLimit !== undefined) {
      this.config.rateLimit = cliArgs.rateLimit;
    }

    if (cliArgs.retry !== undefined) {
      this.config.retryAttempts = cliArgs.retry;
    }

    if (cliArgs.dryRun !== undefined) {
      this.config.dryRun = cliArgs.dryRun;
    }

    // Re-create progress display with updated config
    this.progressDisplay = new CLIProgressDisplay(this.config);
    
    // Re-create download engine with updated config
    this.downloadEngine = new DownloadEngine(this.config);
  }

  /**
   * Validate environment before starting download
   */
  private async validateEnvironment(): Promise<void> {
    try {
      // Check Chrome connection
      const chromeConnection = await this.testChromeConnection();
      
      if (this.config.verbose) {
        console.log(`🌐 Chrome connection: ${chromeConnection.host}:${chromeConnection.port}`);
      }

      // Check output directory
      await this.validateOutputDirectory();

    } catch (error) {
      throw new NetworkError(
        'Environment validation failed. Please ensure Chrome is running in debug mode.',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Test Chrome connection
   */
  private async testChromeConnection(): Promise<{ host: string; port: number }> {
    const testUrl = `http://localhost:${this.config.chromePort}/json/version`;
    
    try {
      const response = await fetch(testUrl, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Chrome debug endpoint returned ${response.status}`);
      }
      
      return {
        host: 'localhost',
        port: this.config.chromePort
      };
      
    } catch (error) {
      throw new Error(
        `Chrome is not running in debug mode on port ${this.config.chromePort}.\n` +
        `Please start Chrome with: google-chrome --headless --remote-debugging-port=${this.config.chromePort}\n` +
        `Or use a different port with --chrome-port option.`
      );
    }
  }

  /**
   * Validate output directory
   */
  private async validateOutputDirectory(): Promise<void> {
    try {
      const { access, mkdir } = await import('fs/promises');
      
      try {
        await access(this.config.outputDir);
      } catch {
        // Directory doesn't exist, create it
        await mkdir(this.config.outputDir, { recursive: true });
        
        if (this.config.verbose) {
          console.log(`📁 Created output directory: ${this.config.outputDir}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to access or create output directory: ${this.config.outputDir}`);
    }
  }

  /**
   * Setup event listeners for real-time UI updates
   */
  private setupEventListeners(): void {
    // Progress events
    this.downloadEngine.onProgress((event) => {
      this.progressDisplay.onProgress(event);
    });

    // Error events
    this.downloadEngine.onError((event) => {
      this.progressDisplay.onError(event);
    });

    // Status events
    this.downloadEngine.onStatus((event) => {
      this.progressDisplay.onStatus(event);
    });

    // Handle process termination gracefully
    process.on('SIGINT', async () => {
      console.log('\n🛑 Gracefully shutting down...');
      await this.downloadEngine.cleanup();
      process.exit(130); // 128 + SIGINT signal number
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Gracefully shutting down...');
      await this.downloadEngine.cleanup();
      process.exit(143); // 128 + SIGTERM signal number
    });
  }

  /**
   * Handle errors with appropriate CLI display
   */
  private handleError(error: Error): void {
    if (error instanceof ValidationError) {
      console.error(`\n🔍 Validation Error: ${error.message}`);
      console.error('\nUse --help for usage information.');
    } else if (error instanceof NetworkError) {
      console.error(`\n🌐 Network Error: ${error.message}`);
      if (error.originalError && this.config.verbose) {
        console.error(`Details: ${error.originalError.message}`);
      }
    } else if (error instanceof AuthError) {
      console.error(`\n🔐 Authentication Error: ${error.message}`);
      console.error('Please ensure you are logged in to identita.gov.cz in your Chrome session.');
    } else {
      // Unknown error
      this.progressDisplay.displayError(error);
    }
  }
}

/**
 * Run CLI if this module is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ESFDownloaderCLI();
  cli.run().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

export { ESFDownloaderCLI };