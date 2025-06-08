import { EventEmitter as NodeEventEmitter } from 'events';
import type { AppEvent, ProgressEvent, ErrorEvent, StatusEvent } from '../types/index.js';
/**
 * Custom EventEmitter for ESF Downloader with type safety
 * Extends Node.js EventEmitter with our specific event types
 */
export declare class ESFEventEmitter extends NodeEventEmitter {
    constructor();
    emitProgress(event: ProgressEvent): boolean;
    emitError(event: ErrorEvent): boolean;
    emitStatus(event: StatusEvent): boolean;
    emitEvent(event: AppEvent): boolean;
    onProgress(listener: (event: ProgressEvent) => void): this;
    onError(listener: (event: ErrorEvent) => void): this;
    onStatus(listener: (event: StatusEvent) => void): this;
    emitProjectStart(projectNumber: string, data?: any): boolean;
    emitDownloadProgress(projectNumber: string, current: number, total: number, data?: any): boolean;
    emitProjectComplete(projectNumber: string, data?: any): boolean;
    emitValidationError(message: string, projectNumber?: string, error?: Error): boolean;
    emitNetworkError(message: string, projectNumber?: string, error?: Error): boolean;
    emitAuthError(message: string, error?: Error): boolean;
    emitFileError(message: string, projectNumber?: string, error?: Error): boolean;
    emitSessionStatus(status: StatusEvent['status'], data?: any): boolean;
    emitEngineStatus(status: StatusEvent['status'], data?: any): boolean;
    removeAllESFListeners(): this;
    getListenerCounts(): Record<string, number>;
}
//# sourceMappingURL=EventEmitter.d.ts.map