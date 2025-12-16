/**
 * ErrorService - Centralized error handling and logging service
 */

import { ErrorType, ErrorInfo } from '@carecore/shared';

// Re-export for convenience
export { ErrorType, ErrorInfo };

/**
 * Error Service for centralized error handling
 */
export class ErrorService {
  private static errors: ErrorInfo[] = [];
  private static maxStoredErrors = 50;

  /**
   * Log an error
   */
  static logError(
    type: ErrorType,
    message: string,
    originalError?: Error | unknown,
    context?: Record<string, unknown>,
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      type,
      message,
      originalError,
      context,
      timestamp: new Date().toISOString(),
    };

    // Store error (keep only last N errors)
    this.errors.push(errorInfo);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (__DEV__) {
      console.error(`[${type}] ${message}`, {
        error: originalError,
        context,
        timestamp: errorInfo.timestamp,
      });
    }

    // In production, you might want to send to a logging service
    // Example: Sentry, LogRocket, etc.
    if (!__DEV__) {
      // TODO: Send to logging service
      // this.sendToLoggingService(errorInfo);
    }

    return errorInfo;
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: unknown, context?: Record<string, unknown>): ErrorInfo {
    let message = 'Network error occurred';

    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        message = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        message = 'Request timed out. Please try again.';
      } else {
        message = error.message;
      }
    } else if (typeof error === 'string') {
      message = error;
    }

    return this.logError(ErrorType.NETWORK, message, error, {
      ...context,
      isNetworkError: true,
    });
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: unknown, context?: Record<string, unknown>): ErrorInfo {
    let message = 'Authentication error occurred';

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    return this.logError(ErrorType.AUTH, message, error, {
      ...context,
      isAuthError: true,
    });
  }

  /**
   * Handle FHIR API errors
   */
  static handleFHIRError(error: unknown, context?: Record<string, unknown>): ErrorInfo {
    let message = 'FHIR API error occurred';

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    return this.logError(ErrorType.FHIR, message, error, {
      ...context,
      isFHIRError: true,
    });
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(
    field: string,
    message: string,
    context?: Record<string, unknown>,
  ): ErrorInfo {
    return this.logError(
      ErrorType.VALIDATION,
      `Validation error in ${field}: ${message}`,
      undefined,
      {
        field,
        ...context,
      },
    );
  }

  /**
   * Get recent errors
   */
  static getRecentErrors(limit = 10): ErrorInfo[] {
    return this.errors.slice(-limit).reverse();
  }

  /**
   * Clear all stored errors
   */
  static clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(errorInfo: ErrorInfo): string {
    switch (errorInfo.type) {
      case ErrorType.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case ErrorType.AUTH:
        return 'Authentication failed. Please log in again.';
      case ErrorType.VALIDATION:
        return errorInfo.message;
      case ErrorType.FHIR:
        return 'An error occurred while processing your medical data. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

export default ErrorService;
