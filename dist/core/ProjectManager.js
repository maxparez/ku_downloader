import fs from 'fs/promises';
import { ESF_CONFIG } from '../config/defaults.js';
import { logger } from '../utils/logger.js';
/**
 * Project Manager for ESF Downloader
 * Handles project number validation, normalization, and URL building
 */
export class ProjectManager {
    static PROJECT_NUMBER_REGEX = /^\d+$/;
    static PROJECT_NUMBER_LENGTH = 7;
    /**
     * Validate project number format
     */
    validateProjectNumber(input) {
        try {
            const cleaned = input.trim();
            if (!cleaned) {
                return {
                    isValid: false,
                    error: 'Project number cannot be empty'
                };
            }
            if (!ProjectManager.PROJECT_NUMBER_REGEX.test(cleaned)) {
                return {
                    isValid: false,
                    error: `Invalid project number format: '${input}'. Only digits are allowed.`
                };
            }
            if (cleaned.length > ProjectManager.PROJECT_NUMBER_LENGTH) {
                return {
                    isValid: false,
                    error: `Project number too long: '${input}'. Maximum ${ProjectManager.PROJECT_NUMBER_LENGTH} digits allowed.`
                };
            }
            const normalized = this.normalizeProjectNumber(cleaned);
            return {
                isValid: true,
                value: normalized
            };
        }
        catch (error) {
            return {
                isValid: false,
                error: `Validation error: ${error.message}`
            };
        }
    }
    /**
     * Normalize project number to 7-digit format with leading zeros
     */
    normalizeProjectNumber(input) {
        const cleaned = input.trim();
        return cleaned.padStart(ProjectManager.PROJECT_NUMBER_LENGTH, '0');
    }
    /**
     * Build ESF project URL from project number
     */
    buildProjectUrl(projectNumber) {
        const validation = this.validateProjectNumber(projectNumber);
        if (!validation.isValid) {
            throw new Error(`Cannot build URL for invalid project number: ${validation.error}`);
        }
        const normalized = validation.value;
        const projectPath = ESF_CONFIG.PROJECT_PATH_TEMPLATE.replace('{projectNumber}', normalized);
        const fullUrl = ESF_CONFIG.BASE_URL + projectPath;
        return {
            baseUrl: ESF_CONFIG.BASE_URL,
            projectPath,
            fullUrl
        };
    }
    /**
     * Parse project numbers from file
     */
    async parseProjectsFromFile(filePath) {
        try {
            logger.debug(`Reading projects from file: ${filePath}`);
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            const projects = [];
            const errors = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // Skip empty lines and comments
                if (!line || line.startsWith('#')) {
                    continue;
                }
                // Remove inline comments
                const cleanLine = line.split('#')[0].trim();
                if (!cleanLine) {
                    continue;
                }
                const validation = this.validateProjectNumber(cleanLine);
                if (validation.isValid) {
                    projects.push(validation.value);
                }
                else {
                    errors.push(`Line ${i + 1}: ${validation.error}`);
                }
            }
            if (errors.length > 0) {
                logger.warn(`Found ${errors.length} invalid project numbers in file`, undefined, { errors });
            }
            if (projects.length === 0) {
                throw new Error('No valid project numbers found in file');
            }
            logger.info(`Loaded ${projects.length} project numbers from file`, undefined, {
                filePath,
                projectCount: projects.length,
                errorCount: errors.length
            });
            return projects;
        }
        catch (error) {
            logger.error(`Failed to parse projects from file: ${filePath}`, error);
            if (error.code === 'ENOENT') {
                throw new Error(`Project file not found: ${filePath}`);
            }
            throw error;
        }
    }
    /**
     * Parse project numbers from comma-separated string
     */
    parseProjectsFromString(input) {
        if (!input.trim()) {
            throw new Error('Project numbers string cannot be empty');
        }
        const projectNumbers = input.split(',');
        const validProjects = [];
        const errors = [];
        for (const project of projectNumbers) {
            const validation = this.validateProjectNumber(project);
            if (validation.isValid) {
                validProjects.push(validation.value);
            }
            else {
                errors.push(`'${project.trim()}': ${validation.error}`);
            }
        }
        if (errors.length > 0) {
            logger.warn(`Found ${errors.length} invalid project numbers in input`, undefined, { errors });
            throw new Error(`Invalid project numbers: ${errors.join(', ')}`);
        }
        if (validProjects.length === 0) {
            throw new Error('No valid project numbers provided');
        }
        logger.debug(`Parsed ${validProjects.length} project numbers from string`);
        return validProjects;
    }
    /**
     * Create project info objects from project numbers
     */
    createProjectInfos(projectNumbers) {
        return projectNumbers.map(number => {
            const validation = this.validateProjectNumber(number);
            if (!validation.isValid) {
                throw new Error(`Invalid project number: ${validation.error}`);
            }
            const normalized = validation.value;
            const url = this.buildProjectUrl(normalized);
            return {
                number: number.trim(),
                normalizedNumber: normalized,
                url: url.fullUrl,
                status: 'pending'
            };
        });
    }
    /**
     * Remove duplicate project numbers
     */
    removeDuplicates(projectNumbers) {
        const normalized = projectNumbers.map(p => this.normalizeProjectNumber(p));
        const unique = [...new Set(normalized)];
        if (unique.length !== projectNumbers.length) {
            logger.info(`Removed ${projectNumbers.length - unique.length} duplicate project numbers`);
        }
        return unique;
    }
    /**
     * Validate batch of project numbers
     */
    validateBatch(projectNumbers) {
        const valid = [];
        const invalid = [];
        for (const number of projectNumbers) {
            const validation = this.validateProjectNumber(number);
            if (validation.isValid) {
                valid.push(validation.value);
            }
            else {
                invalid.push({
                    number: number.trim(),
                    error: validation.error
                });
            }
        }
        return { valid, invalid };
    }
    /**
     * Check if project number is in expected format
     */
    isNormalizedFormat(projectNumber) {
        return projectNumber.length === ProjectManager.PROJECT_NUMBER_LENGTH &&
            ProjectManager.PROJECT_NUMBER_REGEX.test(projectNumber);
    }
    /**
     * Get project statistics
     */
    getProjectStats(projectNumbers) {
        const unique = this.removeDuplicates(projectNumbers);
        const normalized = projectNumbers.filter(p => this.isNormalizedFormat(p.trim()));
        return {
            total: projectNumbers.length,
            unique: unique.length,
            duplicates: projectNumbers.length - unique.length,
            normalized: normalized.length,
            unnormalized: projectNumbers.length - normalized.length
        };
    }
}
//# sourceMappingURL=ProjectManager.js.map