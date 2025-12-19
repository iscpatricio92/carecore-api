/**
 * Error types and interfaces for error handling
 * Shared between frontend and backend
 */

/**
 * Error types for categorizing errors
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  FHIR = 'FHIR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error information interface
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  originalError?: Error | unknown;
  context?: Record<string, unknown>;
  timestamp: string;
}
