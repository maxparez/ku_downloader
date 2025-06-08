import type { FileInfo, ProjectMetadata } from '../types/index';
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
}
//# sourceMappingURL=FileManager.d.ts.map