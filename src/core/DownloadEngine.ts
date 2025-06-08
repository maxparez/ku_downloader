import type { 
  AppConfig, 
  DownloadResult, 
  DownloadOptions,
  ProjectInfo,
  ProjectMetadata,
  ESFCardInfo 
} from '../types/index.js';
import { ESFEventEmitter } from '../events/EventEmitter.js';
import { ProjectManager } from './ProjectManager.js';
import { SessionManager } from './SessionManager.js';
import { FileManager } from './FileManager.js';
import { ESFPortal } from './ESFPortal.js';
import { logger, ProjectLogger } from '../utils/logger.js';
import { ESF_CONFIG } from '../config/defaults.js';

/**
 * Main Download Engine for ESF Downloader
 * Orchestrates the entire download process
 */
export class DownloadEngine extends ESFEventEmitter {
  private projectManager: ProjectManager;
  private sessionManager: SessionManager;
  private fileManager: FileManager;
  private esfPortal: ESFPortal | null = null;
  private config: AppConfig;
  private isRunning = false;

  constructor(config: AppConfig) {
    super();
    this.config = config;
    this.projectManager = new ProjectManager();
    this.sessionManager = new SessionManager(config.chromePort);
    this.fileManager = new FileManager(config.outputDir);

    this.setupEventHandlers();
  }

  /**
   * Download projects from configuration
   */
  async downloadProjects(projectNumbers?: string[]): Promise<DownloadResult[]> {
    if (this.isRunning) {
      throw new Error('Download engine is already running');
    }

    try {
      this.isRunning = true;
      this.emitEngineStatus('working');
      
      const projects = projectNumbers || this.config.projects;
      if (projects.length === 0) {
        throw new Error('No projects specified for download');
      }

      logger.info(`Starting download process for ${projects.length} projects`, undefined, { projects });

      // Prepare projects
      const projectInfos = await this.prepareProjects(projects);
      
      // Connect to Chrome
      await this.connectToChrome();
      
      // Process projects
      const results: DownloadResult[] = [];
      for (const projectInfo of projectInfos) {
        try {
          const result = await this.downloadProject(projectInfo.normalizedNumber);
          results.push(result);
        } catch (error) {
          logger.error(`Project ${projectInfo.normalizedNumber} failed`, error as Error, projectInfo.normalizedNumber);
          
          // Create failed result
          results.push({
            projectNumber: projectInfo.normalizedNumber,
            success: false,
            filesDownloaded: 0,
            totalFiles: 0,
            errors: [(error as Error).message],
            metadata: this.createErrorMetadata(projectInfo.normalizedNumber, error as Error)
          });
        }

        // Rate limiting between projects
        if (this.config.rateLimit > 0) {
          await this.delay(this.config.rateLimit);
        }
      }

      logger.info(`Download process completed: ${results.filter(r => r.success).length}/${results.length} successful`);
      this.emitEngineStatus('idle');
      
      return results;

    } finally {
      this.isRunning = false;
      await this.cleanup();
    }
  }

  /**
   * Download single project
   */
  async downloadProject(projectNumber: string): Promise<DownloadResult> {
    const projectLogger = logger.createProjectLogger(projectNumber);
    
    try {
      projectLogger.info('Starting project download');
      this.emitProjectStart(projectNumber);

      // Validate project number
      const validation = this.projectManager.validateProjectNumber(projectNumber);
      if (!validation.isValid) {
        throw new Error(`Invalid project number: ${validation.error}`);
      }

      const normalizedNumber = validation.value!;
      
      // Ensure Chrome connection and ESF portal
      await this.ensureConnections();
      
      // Create project directory
      await this.fileManager.createProjectDirectory(normalizedNumber);
      
      // Navigate to project page using ESF portal
      await this.esfPortal!.navigateToProject(normalizedNumber);
      
      // Discover PDF cards
      const cards = await this.esfPortal!.discoverPDFCards(normalizedNumber);
      
      if (cards.length === 0) {
        projectLogger.warn('No PDF cards found for project');
        return this.createEmptyResult(normalizedNumber);
      }

      projectLogger.info(`Found ${cards.length} PDF cards to download`);

      if (this.config.dryRun) {
        projectLogger.info('DRY RUN - Simulating downloads');
        
        // Simulate progress for dry run
        for (let i = 0; i < cards.length; i++) {
          this.emitDownloadProgress(normalizedNumber, i + 1, cards.length, { 
            fileName: cards[i].fileName 
          });
          await this.delay(100); // Fast simulation
        }
        
        const metadata = this.createSuccessMetadata(normalizedNumber, cards.length, cards.length, []);
        projectLogger.complete(cards.length, cards.length);
        this.emitProjectComplete(normalizedNumber, { 
          filesDownloaded: cards.length,
          metadata 
        });
        
        return {
          projectNumber: normalizedNumber,
          success: true,
          filesDownloaded: cards.length,
          totalFiles: cards.length,
          errors: [],
          metadata
        };
      }

      // Download PDF cards using enhanced FileManager
      const result = await this.fileManager.downloadPDFCards(
        cards,
        normalizedNumber,
        this.sessionManager.getClient(),
        this.config.rateLimit,
        (current, total) => {
          this.emitDownloadProgress(normalizedNumber, current, total, {
            fileName: cards[current - 1]?.fileName
          });
        }
      );

      const { successful, failed } = result;
      const errors = failed.map(f => f.error);

      // Create metadata
      const metadata = this.createSuccessMetadata(
        normalizedNumber, 
        cards.length, 
        successful.length, 
        errors
      );
      
      await this.fileManager.saveMetadata(normalizedNumber, metadata);

      projectLogger.complete(successful.length, cards.length);
      
      if (failed.length > 0) {
        projectLogger.warn(`${failed.length} files failed to download`);
      }
      
      this.emitProjectComplete(normalizedNumber, { 
        filesDownloaded: successful.length, 
        totalFiles: cards.length, 
        errors 
      });

      return {
        projectNumber: normalizedNumber,
        success: failed.length < cards.length,
        filesDownloaded: successful.length,
        totalFiles: cards.length,
        errors,
        metadata
      };

    } catch (error) {
      projectLogger.error('Project download failed', error as Error);
      this.emitError({
        type: 'network-error',
        message: (error as Error).message,
        projectNumber,
        error: error as Error
      });
      
      throw error;
    }
  }

  /**
   * Ensure Chrome connection and ESF portal are ready
   */
  private async ensureConnections(): Promise<void> {
    // Connect to Chrome if not already connected
    if (!this.sessionManager.isConnected()) {
      await this.sessionManager.connect();
    }
    
    // Initialize ESF portal if not already done
    if (!this.esfPortal) {
      this.esfPortal = new ESFPortal(
        this.sessionManager.getClient(),
        this.config.chromePort
      );
    }
  }

  /**
   * Extract card information from project page
   */
  private async extractCardInfo(projectNumber: string): Promise<ESFCardInfo[]> {
    try {
      // This is a placeholder - actual implementation would depend on ESF portal structure
      // For now, simulate finding cards
      logger.debug(`Extracting card info for project ${projectNumber}`, projectNumber);
      
      // Execute script to find download links
      const result = await this.sessionManager.executeCommand('Runtime.evaluate', {
        expression: `
          // Find all PDF download links
          const links = Array.from(document.querySelectorAll('a[href*=".pdf"]'));
          links.map((link, index) => ({
            cardNumber: index + 1,
            fileName: \`karta_\${String(index + 1).padStart(3, '0')}.pdf\`,
            downloadUrl: link.href,
            participantName: link.textContent?.trim() || 'Unknown'
          }));
        `
      });

      if (result.result && result.result.value) {
        const cards = result.result.value as ESFCardInfo[];
        logger.debug(`Found ${cards.length} cards`, projectNumber);
        return cards;
      }

      // Fallback: simulate some cards for testing
      const simulatedCards: ESFCardInfo[] = [];
      const cardCount = Math.min(Math.floor(Math.random() * 20) + 5, ESF_CONFIG.MAX_CARDS_PER_PROJECT);
      
      for (let i = 1; i <= cardCount; i++) {
        simulatedCards.push({
          participantId: i.toString(),
          fileName: `karta_${String(i).padStart(3, '0')}.pdf`,
          downloadUrl: `https://esf.gov.cz/download/project/${projectNumber}/card/${i}.pdf`,
          participantName: `Participant ${i}`,
          projectNumber
        });
      }

      logger.debug(`Generated ${simulatedCards.length} simulated cards for testing`, projectNumber);
      return simulatedCards;

    } catch (error) {
      logger.error(`Failed to extract card info for project ${projectNumber}`, error as Error, projectNumber);
      return [];
    }
  }

  /**
   * Download individual card
   */
  private async downloadCard(card: ESFCardInfo, projectNumber: string): Promise<void> {
    const projectDir = await this.fileManager.createProjectDirectory(projectNumber);
    const filePath = `${projectDir}/${card.fileName}`;
    
    // Check if file already exists
    if (await this.fileManager.fileExists(filePath)) {
      const isValid = await this.fileManager.validateFile(filePath);
      if (isValid) {
        logger.debug(`File already exists and is valid: ${card.fileName}`, projectNumber);
        return;
      } else {
        logger.debug(`Existing file is invalid, re-downloading: ${card.fileName}`, projectNumber);
      }
    }

    // Download with retries
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.fileManager.downloadFile(card.downloadUrl, filePath, projectNumber);
        
        // Validate downloaded file
        const isValid = await this.fileManager.validateFile(filePath);
        if (!isValid) {
          throw new Error('Downloaded file failed validation');
        }
        
        return; // Success
        
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Download attempt ${attempt}/${this.config.retryAttempts} failed for ${card.fileName}`, projectNumber, {
          error: (error as Error).message
        });
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Download failed after all retry attempts');
  }

  /**
   * Prepare projects for download
   */
  private async prepareProjects(projectNumbers: string[]): Promise<ProjectInfo[]> {
    // Load from file if specified
    if (this.config.inputFile) {
      const fileProjects = await this.projectManager.parseProjectsFromFile(this.config.inputFile);
      projectNumbers = [...projectNumbers, ...fileProjects];
    }

    // Remove duplicates and validate
    const uniqueProjects = this.projectManager.removeDuplicates(projectNumbers);
    const projectInfos = this.projectManager.createProjectInfos(uniqueProjects);

    logger.info(`Prepared ${projectInfos.length} projects for download`, undefined, {
      total: projectNumbers.length,
      unique: uniqueProjects.length,
      duplicatesRemoved: projectNumbers.length - uniqueProjects.length
    });

    return projectInfos;
  }

  /**
   * Connect to Chrome and ensure readiness
   */
  private async connectToChrome(): Promise<void> {
    await this.sessionManager.connect();
    
    if (!this.sessionManager.isConnected()) {
      throw new Error('Failed to connect to Chrome');
    }

    logger.info('Chrome connection established');
  }

  /**
   * Setup event handlers for internal components
   */
  private setupEventHandlers(): void {
    // Forward session events
    this.sessionManager.onStatus((event) => {
      this.emitStatus(event);
    });

    this.sessionManager.onError((event) => {
      this.emitError(event);
    });
  }

  /**
   * Create metadata for successful download
   */
  private createSuccessMetadata(
    projectNumber: string,
    totalCards: number,
    downloadedCards: number,
    errors: string[]
  ): ProjectMetadata {
    return {
      projectNumber,
      downloadDate: new Date().toISOString(),
      totalCards,
      successfulDownloads: downloadedCards,
      errors,
      session: {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      }
    };
  }

  /**
   * Create metadata for failed download
   */
  private createErrorMetadata(projectNumber: string, error: Error): ProjectMetadata {
    return {
      projectNumber,
      downloadDate: new Date().toISOString(),
      totalCards: 0,
      successfulDownloads: 0,
      errors: [error.message],
      session: {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      }
    };
  }

  /**
   * Create empty result for projects with no cards
   */
  private createEmptyResult(projectNumber: string): DownloadResult {
    return {
      projectNumber,
      success: true,
      filesDownloaded: 0,
      totalFiles: 0,
      errors: [],
      metadata: this.createSuccessMetadata(projectNumber, 0, 0, [])
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.sessionManager.cleanup();
      this.removeAllESFListeners();
      logger.debug('DownloadEngine cleanup completed');
    } catch (error) {
      logger.error('Error during DownloadEngine cleanup', error as Error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AppConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update components if needed
    if (newConfig.outputDir) {
      this.fileManager.setBaseOutputDir(newConfig.outputDir);
    }
    
    logger.debug('Configuration updated', undefined, { updatedFields: Object.keys(newConfig) });
  }

  /**
   * Check if engine is currently running
   */
  isEngineRunning(): boolean {
    return this.isRunning;
  }
}