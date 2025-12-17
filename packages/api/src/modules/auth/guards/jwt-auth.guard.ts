import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { User } from '@carecore/shared';

/**
 * JWT Authentication Guard
 *
 * This guard protects endpoints by validating JWT tokens from Keycloak.
 * It extends Passport's AuthGuard('jwt') and adds support for:
 * - Public endpoints (using @Public() decorator)
 * - Better error handling
 * - User type safety
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Check if the route is marked as public
   * If public, allow access without authentication
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If public, allow access without authentication
    if (isPublic) {
      return true;
    }

    // Otherwise, use the parent AuthGuard to validate JWT token
    return super.canActivate(context);
  }

  /**
   * Handle the request after authentication
   * This method is called by Passport after token validation
   */
  handleRequest<TUser = User>(
    err: Error | null,
    user: TUser | false,
    info: Error | string | undefined,
  ): TUser {
    // If there's an error or no user, throw UnauthorizedException
    if (err || !user) {
      const errorMessage = err?.message || info?.toString() || 'Invalid or expired token';
      throw new UnauthorizedException(errorMessage);
    }

    // Return the authenticated user
    return user;
  }
}
