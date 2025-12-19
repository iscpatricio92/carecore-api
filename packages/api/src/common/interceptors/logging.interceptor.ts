import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

/**
 * Enhanced interceptor that uses Pino for structured logging
 * Includes Request ID for traceability
 *
 * Best practices:
 * - Filters health checks and monitoring endpoints
 * - Only logs errors and slow requests in production
 * - Logs all requests in development for debugging
 * - Sanitizes sensitive data from request bodies
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly isProduction: boolean;
  private readonly slowRequestThreshold: number; // ms

  constructor(
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.slowRequestThreshold = 1000; // Log requests slower than 1 second
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const requestId = request['requestId'] || request.id;
    const now = Date.now();

    // Skip logging for health checks and monitoring endpoints
    if (this.shouldSkipLogging(url)) {
      return next.handle();
    }

    // Only log incoming requests in development
    if (!this.isProduction) {
      const { body, query, params } = request;
      this.logger.debug(
        {
          requestId,
          method,
          url,
          body: this.sanitizeBody(body),
          query,
          params,
        },
        `Incoming request: ${method} ${url}`,
      );
    }

    return next.handle().pipe(
      tap({
        next: (_data: unknown) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;

          // In production: only log errors (4xx, 5xx) and slow requests
          // In development: log all requests
          if (this.shouldLogResponse(statusCode, delay)) {
            const logLevel = this.getLogLevel(statusCode);
            this.logger[logLevel](
              {
                requestId,
                method,
                url,
                statusCode,
                duration: `${delay}ms`,
              },
              `Request completed: ${method} ${url} ${statusCode}`,
            );
          }
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(
            {
              requestId,
              method,
              url,
              error: error.message,
              stack: error.stack,
              duration: `${delay}ms`,
            },
            `Request failed: ${method} ${url}`,
          );
        },
      }),
    );
  }

  /**
   * Determines if logging should be skipped for this URL
   * Health checks and monitoring endpoints should not be logged
   */
  private shouldSkipLogging(url: string): boolean {
    const skipPatterns = [
      '/api', // Root health check
      '/api/health',
      '/api/health/db',
      '/metrics',
      '/favicon.ico',
    ];

    return skipPatterns.some((pattern) => url === pattern || url.startsWith(`${pattern}/`));
  }

  /**
   * Determines if a response should be logged based on status code and duration
   */
  private shouldLogResponse(statusCode: number, duration: number): boolean {
    // Always log errors (4xx, 5xx)
    if (statusCode >= 400) {
      return true;
    }

    // Always log slow requests
    if (duration >= this.slowRequestThreshold) {
      return true;
    }

    // In development, log all requests
    if (!this.isProduction) {
      return true;
    }

    // In production, only log errors and slow requests (already handled above)
    return false;
  }

  /**
   * Determines the appropriate log level based on status code
   */
  private getLogLevel(statusCode: number): 'info' | 'warn' | 'error' {
    if (statusCode >= 500) {
      return 'error';
    }
    if (statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  }

  /**
   * Sanitizes body to avoid logging sensitive information
   * Removes or redacts sensitive fields from request bodies
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return body;
    }

    const sanitized: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    const sensitiveFields = [
      'password',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
      'authorization',
      'creditCard',
      'creditCardNumber',
      'cvv',
      'ssn',
      'socialSecurityNumber',
      'apiKey',
      'apikey',
      'clientSecret',
      'client_secret',
      'privateKey',
      'private_key',
    ];

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      const value = sanitized[key];
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive field name (case-insensitive)
      if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeBody(value);
      }
    }

    return sanitized;
  }
}
