import { EventEmitter as NodeEventEmitter } from 'events';
/**
 * Custom EventEmitter for ESF Downloader with type safety
 * Extends Node.js EventEmitter with our specific event types
 */
export class ESFEventEmitter extends NodeEventEmitter {
    constructor() {
        super();
        // Set max listeners to handle multiple UI subscriptions
        this.setMaxListeners(20);
    }
    // Type-safe event emission methods
    emitProgress(event) {
        return this.emit('progress', event);
    }
    emitError(event) {
        return this.emit('error', event);
    }
    emitStatus(event) {
        return this.emit('status', event);
    }
    // Generic emit with type checking
    emitEvent(event) {
        switch (event.type) {
            case 'project-start':
            case 'download-progress':
            case 'project-complete':
                return this.emitProgress(event);
            case 'validation-error':
            case 'network-error':
            case 'auth-error':
            case 'file-error':
                return this.emitError(event);
            case 'session-status':
            case 'engine-status':
                return this.emitStatus(event);
            default:
                console.warn(`Unknown event type: ${event.type}`);
                return false;
        }
    }
    // Type-safe event listener methods
    onProgress(listener) {
        return this.on('progress', listener);
    }
    onError(listener) {
        return this.on('error', listener);
    }
    onStatus(listener) {
        return this.on('status', listener);
    }
    // Convenience methods for common events
    emitProjectStart(projectNumber, data) {
        return this.emitProgress({
            type: 'project-start',
            projectNumber,
            data
        });
    }
    emitDownloadProgress(projectNumber, current, total, data) {
        return this.emitProgress({
            type: 'download-progress',
            projectNumber,
            progress: {
                current,
                total,
                percentage: Math.round((current / total) * 100)
            },
            data
        });
    }
    emitProjectComplete(projectNumber, data) {
        return this.emitProgress({
            type: 'project-complete',
            projectNumber,
            data
        });
    }
    emitValidationError(message, projectNumber, error) {
        return this.emitError({
            type: 'validation-error',
            message,
            projectNumber,
            error
        });
    }
    emitNetworkError(message, projectNumber, error) {
        return this.emitError({
            type: 'network-error',
            message,
            projectNumber,
            error
        });
    }
    emitAuthError(message, error) {
        return this.emitError({
            type: 'auth-error',
            message,
            error
        });
    }
    emitFileError(message, projectNumber, error) {
        return this.emitError({
            type: 'file-error',
            message,
            projectNumber,
            error
        });
    }
    emitSessionStatus(status, data) {
        return this.emitStatus({
            type: 'session-status',
            status,
            data
        });
    }
    emitEngineStatus(status, data) {
        return this.emitStatus({
            type: 'engine-status',
            status,
            data
        });
    }
    // Remove all listeners for cleanup
    removeAllESFListeners() {
        this.removeAllListeners('progress');
        this.removeAllListeners('error');
        this.removeAllListeners('status');
        return this;
    }
    // Get listener counts for monitoring
    getListenerCounts() {
        return {
            progress: this.listenerCount('progress'),
            error: this.listenerCount('error'),
            status: this.listenerCount('status'),
            total: this.listenerCount('progress') + this.listenerCount('error') + this.listenerCount('status')
        };
    }
}
//# sourceMappingURL=EventEmitter.js.map