import type { ProjectInfo, ValidationResult, ESFProjectUrl } from '../types/index';
/**
 * Project Manager for ESF Downloader
 * Handles project number validation, normalization, and URL building
 */
export declare class ProjectManager {
    private static readonly PROJECT_NUMBER_REGEX;
    private static readonly PROJECT_NUMBER_LENGTH;
    /**
     * Validate project number format
     */
    validateProjectNumber(input: string): ValidationResult;
    /**
     * Normalize project number to 7-digit format with leading zeros
     */
    normalizeProjectNumber(input: string): string;
    /**
     * Build ESF project URL from project number
     */
    buildProjectUrl(projectNumber: string): ESFProjectUrl;
    /**
     * Parse project numbers from file
     */
    parseProjectsFromFile(filePath: string): Promise<string[]>;
    /**
     * Parse project numbers from comma-separated string
     */
    parseProjectsFromString(input: string): string[];
    /**
     * Create project info objects from project numbers
     */
    createProjectInfos(projectNumbers: string[]): ProjectInfo[];
    /**
     * Remove duplicate project numbers
     */
    removeDuplicates(projectNumbers: string[]): string[];
    /**
     * Validate batch of project numbers
     */
    validateBatch(projectNumbers: string[]): {
        valid: string[];
        invalid: Array<{
            number: string;
            error: string;
        }>;
    };
    /**
     * Check if project number is in expected format
     */
    isNormalizedFormat(projectNumber: string): boolean;
    /**
     * Get project statistics
     */
    getProjectStats(projectNumbers: string[]): {
        total: number;
        unique: number;
        duplicates: number;
        normalized: number;
        unnormalized: number;
    };
}
//# sourceMappingURL=ProjectManager.d.ts.map