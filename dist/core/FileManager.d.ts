import type { FileInfo, ProjectMetadata, ESFCardInfo, CDPClient } from '../types/index.js';
/**
 * File Manager for ESF Downloader
 * Handles file operations, directory management, and metadata
 */
export declare class FileManager {
    private baseOutputDir;
    constructor(baseOutputDir: string);
    /**
     * Create project directory structure
     */
    createProjectDirectory(projectNumber: string): Promise<string>;
    /**
     * Download file from URL to destination
     */
    downloadFile(url: string, destination: string, projectNumber?: string): Promise<FileInfo>;
    /**
     * Save project metadata
     */
    saveMetadata(projectNumber: string, metadata: ProjectMetadata): Promise<void>;
    /**
     * Load project metadata
     */
    loadMetadata(projectNumber: string): Promise<ProjectMetadata | null>;
    /**
     * Validate downloaded file
     */
    validateFile(filePath: string): Promise<boolean>;
    /**
     * Calculate file checksum
     */
    calculateChecksum(filePath: string, algorithm?: string): Promise<string>;
    /**
     * Check if file already exists
     */
    fileExists(filePath: string): Promise<boolean>;
    /**
     * Get file size
     */
    getFileSize(filePath: string): Promise<number>;
    /**
     * List files in project directory
     */
    listProjectFiles(projectNumber: string): Promise<FileInfo[]>;
    /**
     * Clean up incomplete downloads
     */
    cleanupIncompleteDownloads(projectNumber: string): Promise<void>;
    /**
     * Generate unique filename to avoid conflicts
     */
    generateUniqueFilename(baseName: string, extension: string, projectDir: string): string;
    /**
     * Get project directory stats
     */
    getProjectStats(projectNumber: string): Promise<{
        totalFiles: number;
        totalSize: number;
        lastModified: Date;
    }>;
    /**
     * Ensure project directory exists
     */
    private ensureProjectDirectory;
    /**
     * Create base output directory if it doesn't exist
     */
    ensureBaseDirectory(): Promise<void>;
    /**
     * Get base output directory
     */
    getBaseOutputDir(): string;
    /**
     * Set new base output directory
     */
    setBaseOutputDir(newDir: string): void;
    /**
     * Download PDF card using Chrome DevTools Protocol
     */
    downloadPDFCard(card: ESFCardInfo, projectNumber: string, client: CDPClient, retryAttempts?: number): Promise<FileInfo>;
    /**
     * Download file using Chrome DevTools Protocol
     */
    private downloadWithChrome;
    /**
     * Download via Chrome navigation (for authenticated downloads)
     */
    private downloadViaNavigation;
    /**
     * Download multiple PDF cards with progress tracking
     */
    downloadPDFCards(cards: ESFCardInfo[], projectNumber: string, client: CDPClient, rateLimit?: number, onProgress?: (current: number, total: number) => void): Promise<{
        successful: FileInfo[];
        failed: {
            card: ESFCardInfo;
            error: string;
        }[];
    }>;
    /**
     * Sanitize filename for filesystem
     */
    private sanitizeFilename;
    /**
     * Sleep utility
     */
    private sleep;
}
//# sourceMappingURL=FileManager.d.ts.map