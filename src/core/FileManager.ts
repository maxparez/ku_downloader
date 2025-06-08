import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { 
  FileInfo, 
  ProjectMetadata,
  ESFCardInfo,
  CDPClient
} from '../types/index.js';
import { FileError, NetworkError } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * File Manager for ESF Downloader
 * Handles file operations, directory management, and metadata
 */
export class FileManager {
  constructor(private baseOutputDir: string) {}

  /**
   * Create project directory structure
   */
  async createProjectDirectory(projectNumber: string): Promise<string> {
    try {
      const projectDir = path.join(this.baseOutputDir, `projekt_${projectNumber}`);
      
      await fs.mkdir(projectDir, { recursive: true });
      
      logger.debug(`Created project directory: ${projectDir}`);
      return projectDir;
      
    } catch (error) {
      const message = `Failed to create project directory for ${projectNumber}`;
      logger.fileError(message, this.baseOutputDir, error as Error);
      throw new FileError(message, projectNumber, error as Error);
    }
  }

  /**
   * Download file from URL to destination
   */
  async downloadFile(url: string, destination: string, projectNumber?: string): Promise<FileInfo> {
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
      
      const fileInfo: FileInfo = {
        name: path.basename(destination),
        path: destination,
        url,
        size: stats.size,
        downloaded: true
      };

      logger.fileCreated(destination, stats.size);
      return fileInfo;
      
    } catch (error) {
      const message = `Failed to download file from ${url}`;
      logger.fileError(message, destination, error as Error);
      
      const fileInfo: FileInfo = {
        name: path.basename(destination),
        path: destination,
        url,
        downloaded: false,
        error: (error as Error).message
      };

      throw new FileError(message, projectNumber, error as Error);
    }
  }

  /**
   * Save project metadata
   */
  async saveMetadata(projectNumber: string, metadata: ProjectMetadata): Promise<void> {
    try {
      const projectDir = await this.ensureProjectDirectory(projectNumber);
      const metadataPath = path.join(projectDir, 'metadata.json');
      
      const metadataJson = JSON.stringify(metadata, null, 2);
      await fs.writeFile(metadataPath, metadataJson, 'utf-8');
      
      logger.debug(`Saved metadata for project ${projectNumber}`, projectNumber, { metadataPath });
      
    } catch (error) {
      const message = `Failed to save metadata for project ${projectNumber}`;
      logger.fileError(message, '', error as Error);
      throw new FileError(message, projectNumber, error as Error);
    }
  }

  /**
   * Load project metadata
   */
  async loadMetadata(projectNumber: string): Promise<ProjectMetadata | null> {
    try {
      const projectDir = path.join(this.baseOutputDir, `projekt_${projectNumber}`);
      const metadataPath = path.join(projectDir, 'metadata.json');
      
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content) as ProjectMetadata;
      
      logger.debug(`Loaded metadata for project ${projectNumber}`, projectNumber);
      return metadata;
      
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // Metadata file doesn't exist
      }
      
      logger.fileError(`Failed to load metadata for project ${projectNumber}`, '', error as Error);
      return null;
    }
  }

  /**
   * Validate downloaded file
   */
  async validateFile(filePath: string): Promise<boolean> {
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
      
    } catch (error) {
      logger.fileError(`File validation failed: ${filePath}`, filePath, error as Error);
      return false;
    }
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      const hash = crypto.createHash(algorithm);
      hash.update(buffer);
      return hash.digest('hex');
      
    } catch (error) {
      logger.fileError(`Failed to calculate checksum for ${filePath}`, filePath, error as Error);
      throw new FileError(`Failed to calculate checksum`, undefined, error as Error);
    }
  }

  /**
   * Check if file already exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      throw new FileError(`Failed to get file size`, undefined, error as Error);
    }
  }

  /**
   * List files in project directory
   */
  async listProjectFiles(projectNumber: string): Promise<FileInfo[]> {
    try {
      const projectDir = path.join(this.baseOutputDir, `projekt_${projectNumber}`);
      const files: FileInfo[] = [];
      
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
      
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []; // Directory doesn't exist
      }
      
      throw new FileError(`Failed to list project files`, projectNumber, error as Error);
    }
  }

  /**
   * Clean up incomplete downloads
   */
  async cleanupIncompleteDownloads(projectNumber: string): Promise<void> {
    try {
      const files = await this.listProjectFiles(projectNumber);
      const incompleteFiles: string[] = [];
      
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
      
    } catch (error) {
      logger.error(`Failed to cleanup incomplete downloads`, error as Error, projectNumber);
    }
  }

  /**
   * Generate unique filename to avoid conflicts
   */
  generateUniqueFilename(baseName: string, extension: string, projectDir: string): string {
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
  async getProjectStats(projectNumber: string): Promise<{
    totalFiles: number;
    totalSize: number;
    lastModified: Date;
  }> {
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
      
    } catch (error) {
      throw new FileError(`Failed to get project stats`, projectNumber, error as Error);
    }
  }

  /**
   * Ensure project directory exists
   */
  private async ensureProjectDirectory(projectNumber: string): Promise<string> {
    const projectDir = path.join(this.baseOutputDir, `projekt_${projectNumber}`);
    
    try {
      await fs.access(projectDir);
      return projectDir;
    } catch {
      // Directory doesn't exist, create it
      return await this.createProjectDirectory(projectNumber);
    }
  }

  /**
   * Create base output directory if it doesn't exist
   */
  async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseOutputDir, { recursive: true });
      logger.debug(`Ensured base output directory: ${this.baseOutputDir}`);
    } catch (error) {
      throw new FileError(`Failed to create base output directory: ${this.baseOutputDir}`, undefined, error as Error);
    }
  }

  /**
   * Get base output directory
   */
  getBaseOutputDir(): string {
    return this.baseOutputDir;
  }

  /**
   * Set new base output directory
   */
  setBaseOutputDir(newDir: string): void {
    this.baseOutputDir = newDir;
    logger.debug(`Base output directory changed to: ${newDir}`);
  }

  /**
   * Download PDF card using Chrome DevTools Protocol
   */
  async downloadPDFCard(
    card: ESFCardInfo, 
    projectNumber: string, 
    client: CDPClient,
    retryAttempts: number = 3
  ): Promise<FileInfo> {
    const projectDir = await this.ensureProjectDirectory(projectNumber);
    
    // Sanitize filename
    const sanitizedFilename = this.sanitizeFilename(card.fileName);
    const destination = path.join(projectDir, sanitizedFilename);
    
    // Check if file already exists and is valid
    if (await this.fileExists(destination)) {
      const isValid = await this.validateFile(destination);
      if (isValid) {
        logger.debug(`[${projectNumber}] File already exists: ${sanitizedFilename}`);
        return {
          name: sanitizedFilename,
          path: destination,
          url: card.downloadUrl,
          size: await this.getFileSize(destination),
          downloaded: true
        };
      }
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        logger.debug(`[${projectNumber}] Downloading card ${card.participantId}/${card.fileName} (attempt ${attempt}/${retryAttempts})`);
        
        const fileInfo = await this.downloadWithChrome(
          card.downloadUrl, 
          destination, 
          client,
          projectNumber
        );
        
        // Validate downloaded file
        const isValid = await this.validateFile(destination);
        if (!isValid) {
          throw new Error('Downloaded file validation failed');
        }
        
        logger.debug(`[${projectNumber}] Successfully downloaded: ${card.fileName}`);
        return fileInfo;
        
      } catch (error) {
        lastError = error as Error;
        logger.warn(`[${projectNumber}] Download attempt ${attempt} failed: ${lastError.message}`);
        
        // Clean up failed download
        if (await this.fileExists(destination)) {
          await fs.unlink(destination).catch(() => {}); // Ignore errors
        }
        
        if (attempt < retryAttempts) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          logger.debug(`[${projectNumber}] Waiting ${delay}ms before retry`);
          await this.sleep(delay);
        }
      }
    }
    
    // All attempts failed
    throw new FileError(
      `Failed to download ${card.fileName} after ${retryAttempts} attempts: ${lastError?.message}`,
      projectNumber,
      lastError || undefined
    );
  }

  /**
   * Download file using Chrome DevTools Protocol
   */
  private async downloadWithChrome(
    url: string, 
    destination: string, 
    client: CDPClient,
    projectNumber?: string
  ): Promise<FileInfo> {
    try {
      // Method 1: Try direct navigation download
      const response = await this.downloadViaNavigation(url, destination, client);
      if (response) {
        return response;
      }
      
      // Method 2: Fallback to fetch-based download
      return await this.downloadFile(url, destination, projectNumber);
      
    } catch (error) {
      throw new NetworkError(
        `Chrome download failed for ${url}`,
        projectNumber,
        error as Error
      );
    }
  }

  /**
   * Download via Chrome navigation (for authenticated downloads)
   */
  private async downloadViaNavigation(
    url: string, 
    destination: string, 
    client: CDPClient
  ): Promise<FileInfo | null> {
    try {
      // Enable download domain
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: path.dirname(destination)
      });
      
      // Navigate to download URL
      await client.send('Page.navigate', { url });
      
      // Wait for potential download completion
      await this.sleep(3000);
      
      // Check if file was downloaded
      if (await this.fileExists(destination)) {
        const stats = await fs.stat(destination);
        return {
          name: path.basename(destination),
          path: destination,
          url,
          size: stats.size,
          downloaded: true
        };
      }
      
      return null;
    } catch (error) {
      logger.debug('Navigation download failed', undefined, { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Download multiple PDF cards with progress tracking
   */
  async downloadPDFCards(
    cards: ESFCardInfo[], 
    projectNumber: string, 
    client: CDPClient,
    rateLimit: number = 1000,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ successful: FileInfo[]; failed: { card: ESFCardInfo; error: string }[] }> {
    const successful: FileInfo[] = [];
    const failed: { card: ESFCardInfo; error: string }[] = [];
    
    logger.info(`[${projectNumber}] Starting download of ${cards.length} PDF cards`);
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      
      try {
        // Rate limiting
        if (i > 0) {
          await this.sleep(rateLimit);
        }
        
        const fileInfo = await this.downloadPDFCard(card, projectNumber, client);
        successful.push(fileInfo);
        
        // Report progress
        onProgress?.(i + 1, cards.length);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ card, error: errorMessage });
        
        logger.error(`[${projectNumber}] Failed to download card ${card.participantId}`, error as Error);
      }
    }
    
    logger.info(`[${projectNumber}] Download completed: ${successful.length} successful, ${failed.length} failed`);
    
    return { successful, failed };
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(filename: string): string {
    // Remove invalid characters
    let sanitized = filename.replace(/[<>:"/\\|?*]/g, '_');
    
    // Replace multiple underscores with single
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Remove leading/trailing spaces and dots
    sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
    
    // Ensure PDF extension
    if (!sanitized.toLowerCase().endsWith('.pdf')) {
      sanitized += '.pdf';
    }
    
    // Limit length
    if (sanitized.length > 200) {
      const ext = path.extname(sanitized);
      const base = path.basename(sanitized, ext);
      sanitized = base.substring(0, 200 - ext.length) + ext;
    }
    
    return sanitized || 'document.pdf';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}