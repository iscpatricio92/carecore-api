import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../interfaces/user.interface';

/**
 * Roles Guard
 *
 * This guard validates that the authenticated user has at least one of the required roles
 * to access an endpoint. It works together with the `@Roles()` decorator.
 *
 * The guard:
 * 1. Extracts required roles from the `@Roles()` decorator metadata
 * 2. Extracts user roles from the request (set by JwtAuthGuard)
 * 3. Validates that the user has at least one of the required roles
 * 4. Throws `ForbiddenException` if the user doesn't have the required roles
 *
 * @example
 * ```typescript
 * @Get('admin')
 * @Roles('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async adminEndpoint() {
 *   return { message: 'Admin only' };
 * }
 * ```
 */
@Injectable()
export class RolesGuard {
  constructor(private reflector: Reflector) {}

  /**
   * Check if the user has the required roles to access the endpoint
   * @param context - Execution context containing the request
   * @returns true if user has required roles, throws ForbiddenException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from metadata (set by @Roles() decorator)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: User | undefined = request.user;

    // If no user is found, throw ForbiddenException
    // This should not happen if JwtAuthGuard is applied before RolesGuard
    if (!user) {
      throw new ForbiddenException(
        'User not found. Ensure JwtAuthGuard is applied before RolesGuard.',
      );
    }

    // Check if user has at least one of the required roles
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}. User roles: ${user.roles?.join(', ') || 'none'}.`,
      );
    }

    return true;
  }
}
