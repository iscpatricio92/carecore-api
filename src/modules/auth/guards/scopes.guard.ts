import { Injectable, ExecutionContext, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

import { SCOPES_KEY } from '../decorators/scopes.decorator';
import { InsufficientScopesException } from '../exceptions/insufficient-scopes.exception';
import { User } from '../interfaces/user.interface';

/**
 * Scopes Guard
 *
 * This guard validates that the authenticated user's JWT token contains all the required
 * OAuth2 scopes to access an endpoint. It works together with the `@Scopes()` decorator.
 *
 * The guard:
 * 1. Extracts required scopes from the `@Scopes()` decorator metadata
 * 2. Extracts user scopes from the request (set by JwtAuthGuard/JwtStrategy)
 * 3. Validates that the user has ALL of the required scopes
 * 4. Throws `InsufficientScopesException` if the user doesn't have all required scopes
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @Scopes('patient:read')
 * @UseGuards(JwtAuthGuard, ScopesGuard)
 * async getPatient(@Param('id') id: string) {
 *   return { message: 'Patient data' };
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Multiple scopes - user must have ALL of them
 * @Post(':id/share')
 * @Scopes('consent:read', 'consent:share')
 * @UseGuards(JwtAuthGuard, ScopesGuard)
 * async shareConsent(@Param('id') id: string) {
 *   return { message: 'Consent shared' };
 * }
 * ```
 */
@Injectable()
export class ScopesGuard {
  constructor(
    private reflector: Reflector,
    @Optional() private readonly logger?: PinoLogger,
  ) {
    if (this.logger) {
      this.logger.setContext(ScopesGuard.name);
    }
  }

  /**
   * Check if the user has all the required scopes to access the endpoint
   * @param context - Execution context containing the request
   * @returns true if user has all required scopes, throws InsufficientScopesException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required scopes from metadata (set by @Scopes() decorator)
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no scopes are required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: User | undefined = request.user;

    // If no user is found, throw exception
    // This should not happen if JwtAuthGuard is applied before ScopesGuard
    if (!user) {
      throw new InsufficientScopesException(requiredScopes, []);
    }

    // Get user scopes from the user object
    const userScopes = user.scopes || [];

    // Check if user has ALL of the required scopes
    const hasAllScopes = requiredScopes.every((scope) => userScopes.includes(scope));

    if (!hasAllScopes) {
      // Log scope validation failure
      if (this.logger) {
        this.logger.warn(
          {
            userId: user.id,
            username: user.username,
            requiredScopes,
            userScopes,
            missingScopes: requiredScopes.filter((scope) => !userScopes.includes(scope)),
          },
          'Scope validation failed - user missing required scopes',
        );
      }
      throw new InsufficientScopesException(requiredScopes, userScopes);
    }

    // Log successful scope validation (debug level)
    if (this.logger) {
      this.logger.debug(
        {
          userId: user.id,
          username: user.username,
          requiredScopes,
        },
        'Scope validation successful',
      );
    }

    return true;
  }
}
