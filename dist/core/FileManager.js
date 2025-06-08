import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { FileError } from '../types/index';
import { logger } from '@utils/logger.js';
/**
 * File Manager for ESF Downloader
 * Handles file operations, directory management, and metadata
 */
export class FileManager {
    baseOutputDir;
    constructor(baseOutputDir) {
        this.baseOutputDir = baseOutputDir;
    }
    /**
     * Create project directory structure
     */
    async createProjectDirectory(projectNumber) {
        try {
            const projectDir = path.join(this.baseOutputDir, `projekt_${projectNumber}`);
            await fs.mkdir(projectDir, { recursive: true });
            logger.debug(`Created project directory: ${projectDir}`);
            return projectDir;
        }
        catch (error) {
            const message = `Failed to create project directory for ${projectNumber}`;
            logger.fileError(message, this.baseOutputDir, error);
            throw new FileError(message, projectNumber, error);
        }
    }
    /**
     * Download file from URL to destination
     */
    async downloadFile(url, destination, projectNumber) {
        try {
            logger.debug(`Downloading file: ${url} -> ${destination}`, projectNumber);
            // Ensure destination directory exists
            const destDir = path.dirname(destination);
            await fs.mkdir(destDir, { recursive: true });
            // Download file
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Write file
            await fs.writeFile(destination, buffer);
            // Get file stats
            const stats = await fs.stat(destination);
            const fileInfo = {
                name: path.basename(destination),
                path: destination,
                url,
                size: stats.size,
                downloaded: true
            };
            logger.fileCreated(destination, stats.size);
            return fileInfo;
        }
        catch (error) {
            const message = `Failed to download file from ${url}`;
            logger.fileError(message, destination, error);
            const fileInfo = {
                name: path.basename(destination),
                path: destination,
                url,
                downloaded: false,
                error: error.message
            };
            throw new FileError(message, projectNumber, error);
        }
    }
    /**
     * Save project metadata
     */
    async saveMetadata(projectNumber, metadata) {
        try {
            const projectDir = await this.ensureProjectDirectory(projectNumber);
            const metadataPath = path.join(projectDir, 'metadata.json');
            const metadataJson = JSON.stringify(metadata, null, 2);
            await fs.writeFile(metadataPath, metadataJson, 'utf-8');
            logger.debug(`Saved metadata for project ${projectNumber}`, projectNumber, { metadataPath });
        }
        catch (error) {
            const message = `Failed to save metadata for project ${projectNumber}`;
            logger.fileError(message, '', error);
            throw new FileError(message, projectNumber, error);
        }
    }
    /**
     * Load project metadata
     */
    async loadMetadata(projectNumber) {
        try {
            const projectDir = path.join(this.baseOutputDir, `projekt_${projectNumber}`);
            const metadataPath = path.join(projectDir, 'metadata.json');
            const content = await fs.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(content);
            logger.debug(`Loaded metadata for project ${projectNumber}`, projectNumber);
            return metadata;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null; // Metadata file doesn't exist
            }
            logger.fileError(`Failed to load metadata for project ${projectNumber}`, '', error);
            return null;
        }
    }
    /**
     * Validate downloaded file
     */
    async validateFile(filePath) {
        try {
            const stats = await fs.stat(filePath);
            // Check if file exists and has content
            if (stats.size === 0) {
                logger.warn(`File is empty: ${filePath}`);
                return false;
            }
            // Basic PDF validation (check header)
            if (filePath.toLowerCase().endsWith('.pdf')) {
                const buffer = await fs.readFile(filePath);
                const header = buffer.subarray(0, 4).toString();
                if (header !== '%PDF') {
                    logger.warn(`Invalid PDF file: ${filePath}`);
                    return false;
                }
            }
            logger.debug(`File validation successful: ${filePath}`, undefined, { size: stats.size });
            return true;
        }
        catch (error) {
            logger.fileError(`File validation failed: ${filePath}`, filePath, error);
            return false;
        }
    }
    /**
     * Calculate file checksum
     */
    async calculateChecksum(filePath, algorithm = 'sha256') {
        try {
            const buffer = await fs.readFile(filePath);
            const hash = crypto.createHash(algorithm);
            hash.update(buffer);
            return hash.digest('hex');
        }
        catch (error) {
            logger.fileError(`Failed to calculate checksum for ${filePath}`, filePath, error);
            throw new FileError(`Failed to calculate checksum`, undefined, error);
        }
    }
    /**
     * Check if file already exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get file size
     */
    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        }
        catch (error) {
            throw new FileError(`Failed to get file size`, undefined, error);
        }
    }
    /**
     * List files in project directory
     */
    async listProjectFiles(projectNumber) {
        try {
            const projectDir = path.join(this.baseOutputDir, `projekt_${projectNumber}`);
            const files = [];
            const entries = await fs.readdir(projectDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile() && !entry.name.startsWith('.') && entry.name !== 'metadata.json') {
                    const filePath = path.join(projectDir, entry.name);
                    const stats = await fs.stat(filePath);
                    files.push({
                        name: entry.name,
                        path: filePath,
                        url: '', // URL not available for existing files
                        size: stats.size,
                        downloaded: true
                    });
                }
            }
            return files;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return []; // Directory doesn't exist
            }
            throw new FileError(`Failed to list project files`, projectNumber, error);
        }
    }
    /**
     * Clean up incomplete downloads
     */
    async cleanupIncompleteDownloads(projectNumber) {
        try {
            const files = await this.listProjectFiles(projectNumber);
            const incompleteFiles = [];
            for (const file of files) {
                const isValid = await this.validateFile(file.path);
                if (!isValid) {
                    await fs.unlink(file.path);
                    incompleteFiles.push(file.name);
                }
            }
            if (incompleteFiles.length > 0) {
                logger.info(`Cleaned up ${incompleteFiles.length} incomplete files`, projectNumber, { files: incompleteFiles });
            }
        }
        catch (error) {
            logger.error(`Failed to cleanup incomplete downloads`, error, projectNumber);
        }
    }
    /**
     * Generate unique filename to avoid conflicts
     */
    generateUniqueFilename(baseName, extension, projectDir) {
        let counter = 1;
        let filename = `${baseName}.${extension}`;
        let fullPath = path.join(projectDir, filename);
        // Check if file exists and increment counter until we find unique name
        while (fs.access(fullPath).then(() => true).catch(() => false)) {
            filename = `${baseName}_${counter}.${extension}`;
            fullPath = path.join(projectDir, filename);
            counter++;
        }
        return filename;
    }
    /**
     * Get project directory stats
     */
    async getProjectStats(projectNumber) {
        try {
            const files = await this.listProjectFiles(projectNumber);
            let totalSize = 0;
            let lastModified = new Date(0);
            for (const file of files) {
                totalSize += file.size || 0;
                const stats = await fs.stat(file.path);
                if (stats.mtime > lastModified) {
                    lastModified = stats.mtime;
                }
            }
            return {
                totalFiles: files.length,
                totalSize,
                lastModified
            };
        }
        catch (error) {
            throw new FileError(`Failed to get project stats`, projectNumber, error);
        }
    }
    /**
     * Ensure project directory exists
     */
    async ensureProjectDirectory(projectNumber) {
        const projectDir = path.join(this.baseOutputDir, `projekt_${projectNumber}`);
        try {
            await fs.access(projectDir);
            return projectDir;
        }
        catch {
            // Directory doesn't exist, create it
            return await this.createProjectDirectory(projectNumber);
        }
    }
    /**
     * Create base output directory if it doesn't exist
     */
    async ensureBaseDirectory() {
        try {
            await fs.mkdir(this.baseOutputDir, { recursive: true });
            logger.debug(`Ensured base output directory: ${this.baseOutputDir}`);
        }
        catch (error) {
            throw new FileError(`Failed to create base output directory: ${this.baseOutputDir}`, undefined, error);
        }
    }
    /**
     * Get base output directory
     */
    getBaseOutputDir() {
        return this.baseOutputDir;
    }
    /**
     * Set new base output directory
     */
    setBaseOutputDir(newDir) {
        this.baseOutputDir = newDir;
        logger.debug(`Base output directory changed to: ${newDir}`);
    }
}
//# sourceMappingURL=FileManager.js.map