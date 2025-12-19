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
   * Extract a meaningful error message from various error types
   */
  private static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const errorAny = error as Error & {
        status?: number;
        statusText?: string;
        data?: Record<string, unknown>;
      };

      // Si el error tiene data con mensaje, usarlo primero
      if (errorAny.data) {
        if (typeof errorAny.data.message === 'string' && errorAny.data.message) {
          return errorAny.data.message;
        }
        if (typeof errorAny.data.error === 'string' && errorAny.data.error) {
          return errorAny.data.error;
        }
        if (Array.isArray(errorAny.data.message)) {
          return errorAny.data.message.join(', ');
        }
      }

      // Si el mensaje está vacío o es genérico, intentar extraer más información
      if (!error.message || error.message === 'Error' || error.message.trim() === '') {
        // Verificar si el error tiene status code
        if (errorAny.status) {
          const statusMsg = errorAny.statusText
            ? `${errorAny.status}: ${errorAny.statusText}`
            : `HTTP ${errorAny.status}`;
          return statusMsg;
        }
        if (error.name && error.name !== 'Error') {
          return `${error.name}`;
        }
        return 'An error occurred';
      }

      // Si el mensaje es solo "HTTP 400" o similar, intentar mejorarlo con data
      if (error.message.startsWith('HTTP ') && errorAny.data) {
        if (typeof errorAny.data.message === 'string' && errorAny.data.message) {
          return errorAny.data.message;
        }
      }

      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object') {
      const errorObj = error as { message?: string; error?: string; status?: number };
      if (errorObj.message) return errorObj.message;
      if (errorObj.error) return errorObj.error;
      if (errorObj.status) return `HTTP ${errorObj.status}`;
    }
    return 'Unknown error occurred';
  }

  /**
   * Log an error
   */
  static logError(
    type: ErrorType,
    message: string,
    originalError?: Error | unknown,
    context?: Record<string, unknown>,
  ): ErrorInfo {
    // Si el mensaje está vacío o es genérico, intentar extraer uno mejor del error
    let finalMessage = message;
    if (!message || message === 'Error' || message.trim() === '') {
      finalMessage = this.extractErrorMessage(originalError);
    }

    const errorInfo: ErrorInfo = {
      type,
      message: finalMessage,
      originalError,
      context,
      timestamp: new Date().toISOString(),
    };

    // Store error (keep only last N errors)
    this.errors.push(errorInfo);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift();
    }

    // Log to console in development with better formatting
    if (__DEV__) {
      const errorDetails: Record<string, unknown> = {
        type,
        message: finalMessage,
        timestamp: errorInfo.timestamp,
      };

      // Agregar información del error original si está disponible
      if (originalError instanceof Error) {
        const errorWithData = originalError as Error & {
          status?: number;
          statusText?: string;
          data?: Record<string, unknown>;
        };

        errorDetails.errorName = originalError.name;
        errorDetails.errorMessage = originalError.message;

        // Agregar información HTTP si está disponible
        if (errorWithData.status) {
          errorDetails.status = errorWithData.status;
          errorDetails.statusText = errorWithData.statusText;
        }

        // Agregar data del error si está disponible (puede contener mensajes del backend)
        if (errorWithData.data) {
          errorDetails.responseData = errorWithData.data;
          // Si hay un mensaje en data, mostrarlo prominentemente
          if (errorWithData.data.message) {
            errorDetails.backendMessage = errorWithData.data.message;
          }
        }

        if (originalError.stack) {
          errorDetails.stack = originalError.stack.split('\n').slice(0, 5).join('\n'); // Primeras 5 líneas
        }
      }

      // Agregar contexto si está disponible
      if (context && Object.keys(context).length > 0) {
        errorDetails.context = context;
      }

      // Loggear con formato más legible
      console.group(`🔴 [${type}] ${finalMessage}`);
      console.error('Details:', errorDetails);
      console.groupEnd();
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

    // Intentar extraer un mensaje más descriptivo
    if (error instanceof Error) {
      message = this.extractErrorMessage(error);

      // Si el mensaje sigue siendo genérico, construir uno más específico
      if (message === 'Error' || message === 'An error occurred' || !message.trim()) {
        const resourceType = (context?.resourceType as string) || 'resource';
        const operation = (context?.operation as string) || 'operation';
        message = `Failed to ${operation} ${resourceType}`;
      }
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
    // Si el mensaje ya es user-friendly, usarlo directamente
    const message = errorInfo.message;

    switch (errorInfo.type) {
      case ErrorType.NETWORK:
        // Si el mensaje ya es descriptivo, usarlo; si no, usar el genérico
        if (message && message !== 'Network error occurred' && !message.includes('fetch')) {
          return message;
        }
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case ErrorType.AUTH:
        // Si el mensaje ya es descriptivo, usarlo; si no, usar el genérico
        if (message && message !== 'Authentication error occurred') {
          return message;
        }
        return 'Authentication failed. Please log in again.';
      case ErrorType.VALIDATION:
        return message;
      case ErrorType.FHIR:
        // Intentar hacer el mensaje más específico basado en el contexto
        const context = errorInfo.context;
        if (context?.resourceType && context?.operation) {
          const resourceType = context.resourceType as string;
          const operation = context.operation as string;
          // Si hay un mensaje específico del error, usarlo
          if (message && message !== 'FHIR API error occurred' && !message.includes('Failed to')) {
            return message;
          }
          return `Unable to ${operation} ${resourceType}. Please try again.`;
        }
        // Si el mensaje ya es descriptivo, usarlo
        if (message && message !== 'FHIR API error occurred') {
          return message;
        }
        return 'An error occurred while processing your medical data. Please try again.';
      default:
        // Si el mensaje ya es descriptivo, usarlo
        if (message && message !== 'An unexpected error occurred') {
          return message;
        }
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

export default ErrorService;
