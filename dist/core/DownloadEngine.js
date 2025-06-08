import { ESFEventEmitter } from '../events/EventEmitter.js';
import { ProjectManager } from './ProjectManager.js';
import { SessionManager } from './SessionManager.js';
import { FileManager } from './FileManager.js';
import { ESFPortal } from './ESFPortal.js';
import { logger } from '../utils/logger.js';
/**
 * Main Download Engine for ESF Downloader
 * Orchestrates the entire download process
 */
export class DownloadEngine extends ESFEventEmitter {
    projectManager;
    sessionManager;
    fileManager;
    esfPortal = null;
    config;
    isRunning = false;
    constructor(config) {
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
    async downloadProjects(projectNumbers) {
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
            const results = [];
            for (const projectInfo of projectInfos) {
                try {
                    const result = await this.downloadProject(projectInfo.normalizedNumber);
                    results.push(result);
                }
                catch (error) {
                    logger.error(`Project ${projectInfo.normalizedNumber} failed`, error, projectInfo.normalizedNumber);
                    // Create failed result
                    results.push({
                        projectNumber: projectInfo.normalizedNumber,
                        success: false,
                        filesDownloaded: 0,
                        totalFiles: 0,
                        errors: [error.message],
                        metadata: this.createErrorMetadata(projectInfo.normalizedNumber, error)
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
        }
        finally {
            this.isRunning = false;
            await this.cleanup();
        }
    }
    /**
     * Download single project
     */
    async downloadProject(projectNumber) {
        const projectLogger = logger.createProjectLogger(projectNumber);
        try {
            projectLogger.info('Starting project download');
            this.emitProjectStart(projectNumber);
            // Validate project number
            const validation = this.projectManager.validateProjectNumber(projectNumber);
            if (!validation.isValid) {
                throw new Error(`Invalid project number: ${validation.error}`);
            }
            const normalizedNumber = validation.value;
            // Ensure Chrome connection and ESF portal
            await this.ensureConnections();
            // Create project directory
            await this.fileManager.createProjectDirectory(normalizedNumber);
            // Navigate to project page using ESF portal
            projectLogger.info('Navigating to ESF portal and setting up project page');
            await this.esfPortal.navigateToProject(normalizedNumber);
            // Set progress callback for real-time updates
            this.esfPortal.setProgressCallback((progress) => {
                this.emitDownloadProgress(normalizedNumber, progress.current, progress.total, {
                    fileName: progress.participant,
                    downloaded: progress.downloaded
                });
            });
            // Discover and download PDF cards using optimized workflow
            projectLogger.info('Starting automated PDF discovery and download');
            const cards = await this.esfPortal.discoverPDFCards(normalizedNumber);
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
            // Cards are already downloaded by ESFPortal.discoverPDFCards
            // Just organize the results
            projectLogger.info(`Download completed - organizing ${cards.length} PDFs`);
            const successful = cards.filter(card => card.downloadUrl !== null);
            const failed = cards.filter(card => card.downloadUrl === null);
            const failedWithErrors = failed.map(card => ({
                card,
                error: 'Failed to download PDF'
            }));
            const errors = failedWithErrors.map(f => f.error);
            // Create metadata
            const metadata = this.createSuccessMetadata(normalizedNumber, cards.length, successful.length, errors);
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
        }
        catch (error) {
            projectLogger.error('Project download failed', error);
            this.emitError({
                type: 'network-error',
                message: error.message,
                projectNumber,
                error: error
            });
            throw error;
        }
    }
    /**
     * Ensure Chrome connection and ESF portal are ready
     */
    async ensureConnections() {
        // Connect to Chrome if not already connected
        if (!this.sessionManager.isConnected()) {
            await this.sessionManager.connect();
        }
        // Initialize ESF portal if not already done
        if (!this.esfPortal) {
            this.esfPortal = new ESFPortal(this.sessionManager.getClient(), this.config.chromePort);
        }
    }
    /**
     * Prepare projects for download
     */
    async prepareProjects(projectNumbers) {
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
    async connectToChrome() {
        await this.sessionManager.connect();
        if (!this.sessionManager.isConnected()) {
            throw new Error('Failed to connect to Chrome');
        }
        logger.info('Chrome connection established');
    }
    /**
     * Setup event handlers for internal components
     */
    setupEventHandlers() {
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
    createSuccessMetadata(projectNumber, totalCards, downloadedCards, errors) {
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
    createErrorMetadata(projectNumber, error) {
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
    createEmptyResult(projectNumber) {
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            // Reset ESF portal
            if (this.esfPortal) {
                this.esfPortal.resetCurrentProject();
            }
            await this.sessionManager.cleanup();
            this.removeAllESFListeners();
            logger.debug('DownloadEngine cleanup completed');
        }
        catch (error) {
            logger.error('Error during DownloadEngine cleanup', error);
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
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
    isEngineRunning() {
        return this.isRunning;
    }
}
//# sourceMappingURL=DownloadEngine.js.map