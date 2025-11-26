import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';

/**
 * Enhanced interceptor that uses Pino for structured logging
 * Includes Request ID for traceability
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const requestId = request['requestId'] || request.id;
    const now = Date.now();

    // Log request
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

    return next.handle().pipe(
      tap({
        next: (_data: unknown) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;

          this.logger.info(
            {
              requestId,
              method,
              url,
              statusCode,
              duration: `${delay}ms`,
            },
            `Request completed: ${method} ${url} ${statusCode}`,
          );
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
   * Sanitizes body to avoid logging sensitive information
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'creditCard'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field as keyof typeof sanitized] = '[REDACTED]' as never;
      }
    }

    return sanitized;
  }
}
