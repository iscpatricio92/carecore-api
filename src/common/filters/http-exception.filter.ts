import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FhirErrorService } from '../services/fhir-error.service';

/**
 * Global exception filter that handles errors
 * Returns FHIR OperationOutcome for FHIR endpoints, standard JSON for others
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const exceptionResponse: string | Record<string, unknown> =
      typeof rawResponse === 'string' ? rawResponse : (rawResponse as Record<string, unknown>);

    // Check if this is a FHIR endpoint
    const isFhirEndpoint = request.url.startsWith('/api/fhir');

    if (isFhirEndpoint) {
      // Return FHIR OperationOutcome for FHIR endpoints
      this.handleFhirError(exception, status, exceptionResponse, request, response);
    } else {
      // Return standard JSON for non-FHIR endpoints
      this.handleStandardError(status, exceptionResponse, request, response);
    }
  }

  /**
   * Handles errors for FHIR endpoints, returning OperationOutcome
   */
  private handleFhirError(
    exception: unknown,
    status: number,
    exceptionResponse: string | Record<string, unknown>,
    request: Request,
    response: Response,
  ): void {
    let operationOutcome;

    // Handle validation errors (from class-validator)
    if (status === HttpStatus.BAD_REQUEST && typeof exceptionResponse === 'object') {
      const validationErrors = this.extractValidationErrors(exceptionResponse);
      if (validationErrors.length > 0) {
        operationOutcome = FhirErrorService.createValidationError(validationErrors);
      }
    }

    // Handle specific HTTP status codes
    if (!operationOutcome) {
      if (status === HttpStatus.NOT_FOUND) {
        const resourceId = this.extractResourceId(request.url);
        const resourceType = this.extractResourceType(request.url);
        operationOutcome = FhirErrorService.createNotFoundError(resourceType, resourceId);
      } else if (status === HttpStatus.UNAUTHORIZED) {
        const message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as { message?: string })?.message || 'Authentication required';
        operationOutcome = FhirErrorService.createUnauthorizedError(message);
      } else if (status === HttpStatus.FORBIDDEN) {
        const message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as { message?: string })?.message || 'Access denied';
        operationOutcome = FhirErrorService.createForbiddenError(message);
      } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        const message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as { message?: string })?.message || 'Internal server error';
        operationOutcome = FhirErrorService.createInternalError(message);
      } else {
        // Generic error
        const message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as { message?: string })?.message || 'An error occurred';
        operationOutcome = FhirErrorService.createOperationOutcome(status, message);
      }
    }

    // Log error for debugging
    this.logger.error(
      {
        status,
        url: request.url,
        method: request.method,
        requestId: request.requestId,
        error: exception instanceof Error ? exception.message : 'Unknown error',
      },
      'FHIR error occurred',
    );

    response.status(status).json(operationOutcome);
  }

  /**
   * Handles errors for non-FHIR endpoints, returning standard JSON
   */
  private handleStandardError(
    status: number,
    exceptionResponse: string | Record<string, unknown>,
    request: Request,
    response: Response,
  ): void {
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] })?.message || 'An error occurred';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }

  /**
   * Extracts validation errors from class-validator response
   */
  private extractValidationErrors(
    exceptionResponse: Record<string, unknown>,
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    if (Array.isArray(exceptionResponse.message)) {
      exceptionResponse.message.forEach((msg: string) => {
        errors.push({ field: 'unknown', message: msg });
      });
    } else if (Array.isArray((exceptionResponse as { message?: unknown[] }).message)) {
      (exceptionResponse as { message: unknown[] }).message.forEach((msg: unknown) => {
        if (typeof msg === 'string') {
          errors.push({ field: 'unknown', message: msg });
        }
      });
    }

    return errors;
  }

  /**
   * Extracts resource ID from FHIR URL
   */
  private extractResourceId(url: string): string {
    const match = url.match(/\/fhir\/[^/]+\/([^/?]+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Extracts resource type from FHIR URL
   */
  private extractResourceType(url: string): string {
    const match = url.match(/\/fhir\/([^/]+)/);
    return match ? match[1] : 'Resource';
  }
}
