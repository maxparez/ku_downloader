// Main type definitions for ESF Downloader
// Error Types
export class ESFError extends Error {
    type;
    projectNumber;
    originalError;
    constructor(message, type, projectNumber, originalError) {
        super(message);
        this.type = type;
        this.projectNumber = projectNumber;
        this.originalError = originalError;
        this.name = 'ESFError';
    }
}
export class ValidationError extends ESFError {
    constructor(message, projectNumber) {
        super(message, 'validation-error', projectNumber);
        this.name = 'ValidationError';
    }
}
export class NetworkError extends ESFError {
    constructor(message, projectNumber, originalError) {
        super(message, 'network-error', projectNumber, originalError);
        this.name = 'NetworkError';
    }
}
export class AuthError extends ESFError {
    constructor(message) {
        super(message, 'auth-error');
        this.name = 'AuthError';
    }
}
export class FileError extends ESFError {
    constructor(message, projectNumber, originalError) {
        super(message, 'file-error', projectNumber, originalError);
        this.name = 'FileError';
    }
}
//# sourceMappingURL=index.js.map