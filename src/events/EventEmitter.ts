import { EventEmitter as NodeEventEmitter } from 'events';
import type { AppEvent, ProgressEvent, ErrorEvent, StatusEvent } from '../types/index.js';

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
  emitProgress(event: ProgressEvent): boolean {
    return this.emit('progress', event);
  }

  emitError(event: ErrorEvent): boolean {
    return this.emit('error', event);
  }

  emitStatus(event: StatusEvent): boolean {
    return this.emit('status', event);
  }

  // Generic emit with type checking
  emitEvent(event: AppEvent): boolean {
    switch (event.type) {
      case 'project-start':
      case 'download-progress':
      case 'project-complete':
        return this.emitProgress(event as ProgressEvent);
      
      case 'validation-error':
      case 'network-error':
      case 'auth-error':
      case 'file-error':
        return this.emitError(event as ErrorEvent);
      
      case 'session-status':
      case 'engine-status':
        return this.emitStatus(event as StatusEvent);
      
      default:
        console.warn(`Unknown event type: ${(event as any).type}`);
        return false;
    }
  }

  // Type-safe event listener methods
  onProgress(listener: (event: ProgressEvent) => void): this {
    return this.on('progress', listener);
  }

  onError(listener: (event: ErrorEvent) => void): this {
    return this.on('error', listener);
  }

  onStatus(listener: (event: StatusEvent) => void): this {
    return this.on('status', listener);
  }

  // Convenience methods for common events
  emitProjectStart(projectNumber: string, data?: any): boolean {
    return this.emitProgress({
      type: 'project-start',
      projectNumber,
      data
    });
  }

  emitDownloadProgress(projectNumber: string, current: number, total: number, data?: any): boolean {
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

  emitProjectComplete(projectNumber: string, data?: any): boolean {
    return this.emitProgress({
      type: 'project-complete',
      projectNumber,
      data
    });
  }

  emitValidationError(message: string, projectNumber?: string, error?: Error): boolean {
    return this.emitError({
      type: 'validation-error',
      message,
      projectNumber,
      error
    });
  }

  emitNetworkError(message: string, projectNumber?: string, error?: Error): boolean {
    return this.emitError({
      type: 'network-error',
      message,
      projectNumber,
      error
    });
  }

  emitAuthError(message: string, error?: Error): boolean {
    return this.emitError({
      type: 'auth-error',
      message,
      error
    });
  }

  emitFileError(message: string, projectNumber?: string, error?: Error): boolean {
    return this.emitError({
      type: 'file-error',
      message,
      projectNumber,
      error
    });
  }

  emitSessionStatus(status: StatusEvent['status'], data?: any): boolean {
    return this.emitStatus({
      type: 'session-status',
      status,
      data
    });
  }

  emitEngineStatus(status: StatusEvent['status'], data?: any): boolean {
    return this.emitStatus({
      type: 'engine-status',
      status,
      data
    });
  }

  // Remove all listeners for cleanup
  removeAllESFListeners(): this {
    this.removeAllListeners('progress');
    this.removeAllListeners('error');
    this.removeAllListeners('status');
    return this;
  }

  // Get listener counts for monitoring
  getListenerCounts(): Record<string, number> {
    return {
      progress: this.listenerCount('progress'),
      error: this.listenerCount('error'),
      status: this.listenerCount('status'),
      total: this.listenerCount('progress') + this.listenerCount('error') + this.listenerCount('status')
    };
  }
}