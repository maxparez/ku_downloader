import type { 
  ProgressEvent, 
  ErrorEvent, 
  StatusEvent, 
  AppConfig 
} from '../../types/index.js';

/**
 * CLI progress display for ESF Downloader
 * Handles real-time progress updates and status information
 */
export class CLIProgressDisplay {
  private config: AppConfig;
  private startTime: Date;
  private completedProjects: number = 0;
  private totalProjects: number = 0;
  private currentProject: string | null = null;
  private projectStartTime: Date | null = null;

  constructor(config: AppConfig) {
    this.config = config;
    this.startTime = new Date();
  }

  /**
   * Initialize progress tracking
   */
  initialize(totalProjects: number): void {
    this.totalProjects = totalProjects;
    this.completedProjects = 0;
    this.currentProject = null;
    this.projectStartTime = null;

    if (this.config.verbose) {
      console.log(`\n🚀 ESF Downloader starting...`);
      console.log(`📁 Output directory: ${this.config.outputDir}`);
      console.log(`📊 Projects to process: ${totalProjects}`);
      console.log(`⏱️  Rate limit: ${this.config.rateLimit}ms`);
      console.log(`🔄 Retry attempts: ${this.config.retryAttempts}`);
      if (this.config.dryRun) {
        console.log(`🧪 DRY RUN MODE - No files will be downloaded`);
      }
      console.log('─'.repeat(60));
    } else {
      console.log(`\nProcessing ${totalProjects} project(s)...`);
    }
  }

  /**
   * Handle progress events from the core engine
   */
  onProgress(event: ProgressEvent): void {
    switch (event.type) {
      case 'project-start':
        this.handleProjectStart(event);
        break;
      case 'download-progress':
        this.handleDownloadProgress(event);
        break;
      case 'project-complete':
        this.handleProjectComplete(event);
        break;
    }
  }

  /**
   * Handle error events from the core engine
   */
  onError(event: ErrorEvent): void {
    const prefix = this.getErrorPrefix(event.type);
    const projectInfo = event.projectNumber ? ` [${event.projectNumber}]` : '';
    
    console.error(`${prefix}${projectInfo} ${event.message}`);
    
    if (this.config.verbose && event.error) {
      console.error(`   Details: ${event.error.message}`);
      if (event.error.stack) {
        console.error(`   Stack: ${event.error.stack.split('\n')[1]?.trim()}`);
      }
    }
  }

  /**
   * Handle status events from the core engine
   */
  onStatus(event: StatusEvent): void {
    if (!this.config.verbose) return;

    const prefix = this.getStatusPrefix(event.type);
    const statusIcon = this.getStatusIcon(event.status);
    
    console.log(`${prefix} ${statusIcon} ${event.status}`);
    
    if (event.data) {
      console.log(`   ${JSON.stringify(event.data)}`);
    }
  }

  /**
   * Handle project start
   */
  private handleProjectStart(event: ProgressEvent): void {
    this.currentProject = event.projectNumber;
    this.projectStartTime = new Date();

    if (this.config.verbose) {
      console.log(`\n📂 Starting project ${event.projectNumber} (${this.completedProjects + 1}/${this.totalProjects})`);
    } else {
      process.stdout.write(`Processing ${event.projectNumber}... `);
    }
  }

  /**
   * Handle download progress
   */
  private handleDownloadProgress(event: ProgressEvent): void {
    if (!event.progress) return;

    const { current, total, percentage } = event.progress;
    
    if (this.config.verbose) {
      const bar = this.createProgressBar(percentage, 30);
      console.log(`   📥 Downloading: ${bar} ${current}/${total} (${percentage}%)`);
    } else {
      // Simple progress for non-verbose mode
      if (current === 1) {
        process.stdout.write(`${total} files `);
      }
      if (current % 5 === 0 || current === total) {
        process.stdout.write('.');
      }
    }
  }

  /**
   * Handle project completion
   */
  private handleProjectComplete(event: ProgressEvent): void {
    this.completedProjects++;
    const duration = this.projectStartTime ? 
      Date.now() - this.projectStartTime.getTime() : 0;

    if (this.config.verbose) {
      console.log(`   ✅ Project ${event.projectNumber} completed in ${this.formatDuration(duration)}`);
      if (event.data) {
        console.log(`   📊 Files downloaded: ${event.data.filesDownloaded || 0}`);
        if (event.data.errors?.length > 0) {
          console.log(`   ⚠️  Errors: ${event.data.errors.length}`);
        }
      }
    } else {
      console.log(` ✅ (${this.formatDuration(duration)})`);
    }

    this.currentProject = null;
    this.projectStartTime = null;
  }

  /**
   * Display final summary
   */
  displaySummary(results: any[]): void {
    const totalDuration = Date.now() - this.startTime.getTime();
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const totalFiles = results.reduce((sum, r) => sum + (r.filesDownloaded || 0), 0);

    console.log('\n' + '─'.repeat(60));
    console.log('📊 DOWNLOAD SUMMARY');
    console.log('─'.repeat(60));
    console.log(`✅ Successful projects: ${successful}`);
    console.log(`❌ Failed projects: ${failed}`);
    console.log(`📄 Total files downloaded: ${totalFiles}`);
    console.log(`⏱️  Total time: ${this.formatDuration(totalDuration)}`);
    
    if (this.config.dryRun) {
      console.log(`🧪 DRY RUN - No files were actually downloaded`);
    }

    if (failed > 0) {
      console.log('\n❌ FAILED PROJECTS:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   • ${result.projectNumber}: ${result.errors?.[0] || 'Unknown error'}`);
      });
    }

    console.log('─'.repeat(60));
  }

  /**
   * Display error summary
   */
  displayError(error: Error): void {
    console.error('\n❌ DOWNLOAD FAILED');
    console.error('─'.repeat(60));
    console.error(`Error: ${error.message}`);
    
    if (this.config.verbose && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    console.error('─'.repeat(60));
  }

  /**
   * Create ASCII progress bar
   */
  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Get error prefix based on error type
   */
  private getErrorPrefix(type: ErrorEvent['type']): string {
    const prefixes = {
      'validation-error': '🔍 Validation Error:',
      'network-error': '🌐 Network Error:',
      'auth-error': '🔐 Authentication Error:',
      'file-error': '📁 File Error:'
    };
    return prefixes[type] || '❌ Error:';
  }

  /**
   * Get status prefix based on status type
   */
  private getStatusPrefix(type: StatusEvent['type']): string {
    const prefixes = {
      'session-status': '🔗 Session:',
      'engine-status': '⚙️  Engine:'
    };
    return prefixes[type] || 'ℹ️  Status:';
  }

  /**
   * Get status icon based on status
   */
  private getStatusIcon(status: StatusEvent['status']): string {
    const icons = {
      'connected': '🟢',
      'disconnected': '🔴',
      'idle': '⚪',
      'working': '🟡'
    };
    return icons[status] || '⚪';
  }

  /**
   * Clear current line (for progress updates)
   */
  private clearLine(): void {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  }
}