import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

import { AuditService } from '../audit.service';
import { User } from '../../auth/interfaces/user.interface';
import { MODULE_TO_RESOURCE_TYPE } from '../../../common/constants/fhir-resource-types';

/**
 * Audit Interceptor
 * Automatically logs all HTTP requests to FHIR endpoints
 *
 * @description
 * This interceptor captures all requests to FHIR resources and logs them
 * for audit purposes. It extracts user information, request details, and
 * response status codes.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract user from request (set by JwtAuthGuard)
    const user = (request as Request & { user?: User }).user;

    // Extract request information
    const requestMethod = request.method;
    const requestPath = request.path;
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket.remoteAddress ||
      null;
    const userAgent = request.headers['user-agent'] || null;

    // Determine resource type and ID from path
    const { resourceType, resourceId, action } = this.extractResourceInfo(requestPath);

    // Skip audit logging for non-FHIR endpoints
    if (!resourceType && !this.isFhirEndpoint(requestPath)) {
      return next.handle();
    }

    // Determine action from HTTP method
    const auditAction = action || this.getActionFromMethod(requestMethod);

    // Track response status
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    return next.handle().pipe(
      tap(() => {
        statusCode = response.statusCode;

        // Log access for read/search operations
        if (auditAction === 'read' || auditAction === 'search') {
          this.auditService
            .logAccess({
              action: auditAction,
              resourceType: resourceType || 'Unknown',
              resourceId: resourceId || null,
              user: user || null,
              ipAddress,
              userAgent,
              requestMethod,
              requestPath,
              statusCode,
            })
            .catch((error) => {
              // Silently fail - audit logging should not break the application
              console.error('Audit logging failed:', error);
            });
        }
      }),
      catchError((error) => {
        statusCode = error.status || 500;
        errorMessage = error.message || 'Unknown error';

        // Log failed access
        if (auditAction === 'read' || auditAction === 'search') {
          this.auditService
            .logAccess({
              action: auditAction,
              resourceType: resourceType || 'Unknown',
              resourceId: resourceId || null,
              user: user || null,
              ipAddress,
              userAgent,
              requestMethod,
              requestPath,
              statusCode,
              errorMessage,
            })
            .catch((err) => {
              console.error('Audit logging failed:', err);
            });
        }

        throw error;
      }),
    );
  }

  /**
   * Extracts resource type, ID, and action from request path
   */
  private extractResourceInfo(path: string): {
    resourceType: string | null;
    resourceId: string | null;
    action: string | null;
  } {
    // Match FHIR resource patterns:
    // /api/fhir/Patient/{id}
    // /api/fhir/Patient
    // /api/patients/{id}
    // /api/consents/{id}
    const fhirResourcePattern = /\/api\/(?:fhir\/)?([A-Z][a-zA-Z]+)(?:\/([^/?]+))?/;
    const match = path.match(fhirResourcePattern);

    if (match) {
      const resourceType = match[1];
      const resourceId = match[2] || null;

      // Determine action from path
      let action: string | null = null;
      if (path.includes('/search') || path.includes('?')) {
        action = 'search';
      } else if (resourceId) {
        action = 'read';
      } else {
        action = 'search'; // List operation
      }

      return { resourceType, resourceId, action };
    }

    // Try alternative patterns for module-specific endpoints
    const modulePattern =
      /\/api\/(patients|practitioners|encounters|consents|documents)(?:\/([^/?]+))?/;
    const moduleMatch = path.match(modulePattern);

    if (moduleMatch) {
      const moduleName = moduleMatch[1];
      const resourceId = moduleMatch[2] || null;

      // Map module names to resource types
      const resourceType = MODULE_TO_RESOURCE_TYPE[moduleName] || moduleName;

      let action: string | null = null;
      if (path.includes('/search') || path.includes('?')) {
        action = 'search';
      } else if (resourceId) {
        action = 'read';
      } else {
        action = 'search';
      }

      return { resourceType, resourceId, action };
    }

    return { resourceType: null, resourceId: null, action: null };
  }

  /**
   * Checks if the path is a FHIR endpoint
   */
  private isFhirEndpoint(path: string): boolean {
    return (
      path.startsWith('/api/fhir/') ||
      path.startsWith('/api/patients') ||
      path.startsWith('/api/practitioners') ||
      path.startsWith('/api/encounters') ||
      path.startsWith('/api/consents') ||
      path.startsWith('/api/documents')
    );
  }

  /**
   * Maps HTTP method to audit action
   */
  private getActionFromMethod(method: string): string {
    const methodMap: Record<string, string> = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };

    return methodMap[method] || 'unknown';
  }
}
