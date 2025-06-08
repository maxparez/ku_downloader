import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { CLIArgs, ValidationResult } from '../../types/index.js';
import { ValidationError } from '../../types/index.js';

/**
 * CLI argument parser for ESF Downloader
 * Handles command line arguments using Commander.js
 */
export class CLIArgumentParser {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupProgram();
  }

  /**
   * Parse command line arguments
   */
  parse(argv: string[]): CLIArgs {
    this.program.parse(argv);
    const options = this.program.opts();
    
    // Validate and transform options
    const args: CLIArgs = {
      projects: this.parseProjects(options.projects, options.file),
      file: options.file,
      output: options.output,
      verbose: options.verbose || false,
      rateLimit: this.parseNumber(options.rateLimit, 'rateLimit'),
      retry: this.parseNumber(options.retry, 'retry'),
      dryRun: options.dryRun || false
    };

    this.validateArgs(args);
    return args;
  }

  /**
   * Setup Commander.js program configuration
   */
  private setupProgram(): void {
    this.program
      .name('esf-downloader')
      .description('ESF ČR PDF downloader with identita.gov.cz authentication')
      .version('1.0.0')
      .option('-p, --projects <numbers>', 'Comma-separated project numbers (e.g., 9356,7890)')
      .option('-f, --file <path>', 'Path to file containing project numbers (one per line)')
      .option('-o, --output <directory>', 'Output directory for downloaded files')
      .option('-v, --verbose', 'Enable verbose logging')
      .option('-r, --rate-limit <ms>', 'Rate limit between requests in milliseconds', '1000')
      .option('--retry <count>', 'Number of retry attempts for failed downloads', '3')
      .option('--dry-run', 'Simulate downloads without actually downloading files');

    // Add examples
    this.program.addHelpText('after', `
Examples:
  $ npm run download -- --projects 9356
  $ npm run download -- --projects 9356,7890 --output ./projekty
  $ npm run download -- --file projects.txt --verbose
  $ npm run download -- --projects 9356 --dry-run
  $ npm run download -- --projects 9356,7890 --rate-limit 2000 --retry 5
`);
  }

  /**
   * Parse project numbers from CLI arguments or file
   */
  private parseProjects(projectsArg?: string, fileArg?: string): string[] | undefined {
    if (projectsArg && fileArg) {
      throw new ValidationError('Cannot specify both --projects and --file options');
    }

    if (projectsArg) {
      return projectsArg
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    }

    if (fileArg) {
      return this.readProjectsFromFile(fileArg);
    }

    return undefined;
  }

  /**
   * Read project numbers from file
   */
  private readProjectsFromFile(filePath: string): string[] {
    try {
      const absolutePath = resolve(filePath);
      const content = readFileSync(absolutePath, 'utf-8');
      
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'))
        .map(line => {
          // Extract just the number if line contains other data
          const match = line.match(/\d+/);
          return match ? match[0] : line;
        });
    } catch (error) {
      throw new ValidationError(
        `Failed to read projects file: ${filePath}. ${(error as Error).message}`
      );
    }
  }

  /**
   * Parse and validate numeric options
   */
  private parseNumber(value: string | undefined, optionName: string): number | undefined {
    if (!value) return undefined;

    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
      throw new ValidationError(`Invalid ${optionName}: ${value}. Must be a positive number.`);
    }

    return parsed;
  }

  /**
   * Validate parsed arguments
   */
  private validateArgs(args: CLIArgs): void {
    // At least one source of projects must be specified
    if (!args.projects || args.projects.length === 0) {
      throw new ValidationError(
        'No projects specified. Use --projects or --file option to specify project numbers.'
      );
    }

    // Validate project numbers format
    for (const project of args.projects) {
      const validation = this.validateProjectNumber(project);
      if (!validation.isValid) {
        throw new ValidationError(validation.error!);
      }
    }

    // Validate rate limit
    if (args.rateLimit !== undefined && args.rateLimit < 100) {
      throw new ValidationError('Rate limit must be at least 100ms to avoid overwhelming the server.');
    }

    // Validate retry attempts
    if (args.retry !== undefined && args.retry > 10) {
      throw new ValidationError('Maximum retry attempts is 10 to prevent infinite loops.');
    }
  }

  /**
   * Validate individual project number
   */
  private validateProjectNumber(projectNumber: string): ValidationResult {
    // Remove any whitespace
    const cleaned = projectNumber.trim();

    // Check if empty
    if (!cleaned) {
      return {
        isValid: false,
        error: 'Project number cannot be empty'
      };
    }

    // Check if numeric
    if (!/^\d+$/.test(cleaned)) {
      return {
        isValid: false,
        error: `Invalid project number format: ${cleaned}. Must contain only digits.`
      };
    }

    // Check length (typical project numbers are 4-6 digits)
    if (cleaned.length < 1 || cleaned.length > 8) {
      return {
        isValid: false,
        error: `Invalid project number length: ${cleaned}. Must be 1-8 digits.`
      };
    }

    return {
      isValid: true,
      value: cleaned
    };
  }

  /**
   * Display help information
   */
  displayHelp(): void {
    this.program.help();
  }

  /**
   * Get program instance for testing
   */
  getProgram(): Command {
    return this.program;
  }
}