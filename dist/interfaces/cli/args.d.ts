import { Command } from 'commander';
import type { CLIArgs } from '../../types/index.js';
/**
 * CLI argument parser for ESF Downloader
 * Handles command line arguments using Commander.js
 */
export declare class CLIArgumentParser {
    private program;
    constructor();
    /**
     * Parse command line arguments
     */
    parse(argv: string[]): CLIArgs;
    /**
     * Setup Commander.js program configuration
     */
    private setupProgram;
    /**
     * Parse project numbers from CLI arguments or file
     */
    private parseProjects;
    /**
     * Read project numbers from file
     */
    private readProjectsFromFile;
    /**
     * Parse and validate numeric options
     */
    private parseNumber;
    /**
     * Validate parsed arguments
     */
    private validateArgs;
    /**
     * Validate individual project number
     */
    private validateProjectNumber;
    /**
     * Display help information
     */
    displayHelp(): void;
    /**
     * Get program instance for testing
     */
    getProgram(): Command;
}
//# sourceMappingURL=args.d.ts.map