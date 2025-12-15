import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';

import { User } from '@carecore/shared';
import { ROLES } from '../../../common/constants/roles';
import { KeycloakAdminService } from '../services/keycloak-admin.service';

/**
 * MFA Required Guard
 *
 * This guard enforces Multi-Factor Authentication (MFA) for users with critical roles
 * (admin, practitioner). If a user has a critical role but MFA is not enabled,
 * access is denied with a clear error message.
 *
 * The guard:
 * 1. Checks if the user has a critical role (admin, practitioner)
 * 2. Verifies if MFA is enabled for the user in Keycloak
 * 3. Throws `ForbiddenException` if MFA is required but not enabled
 *
 * @example
 * ```typescript
 * @Get('admin')
 * @UseGuards(JwtAuthGuard, MFARequiredGuard)
 * async adminEndpoint() {
 *   return { message: 'Admin only' };
 * }
 * ```
 */
@Injectable()
export class MFARequiredGuard {
  private readonly criticalRoles = [ROLES.ADMIN, ROLES.PRACTITIONER];

  constructor(private readonly keycloakAdminService: KeycloakAdminService) {}

  /**
   * Check if the user has MFA enabled (if required for their role)
   * @param context - Execution context containing the request
   * @returns true if MFA is enabled or not required, throws ForbiddenException otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: User | undefined = request.user;

    // If no user is found, allow other guards to handle authentication
    // This should not happen if JwtAuthGuard is applied before MFARequiredGuard
    if (!user) {
      return true; // Let JwtAuthGuard handle authentication errors
    }

    // Check if user has a critical role
    const hasCriticalRole = this.criticalRoles.some((role) => user.roles?.includes(role));

    // If user doesn't have a critical role, MFA is not required
    if (!hasCriticalRole) {
      return true;
    }

    // For critical roles, verify MFA is enabled
    try {
      const mfaEnabled = await this.keycloakAdminService.userHasMFA(user.keycloakUserId);

      if (!mfaEnabled) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'MFA is required for your role. Please configure MFA first.',
          error: 'Forbidden',
          mfaSetupUrl: '/api/auth/mfa/setup',
        });
      }

      return true;
    } catch (error) {
      // If error is already a ForbiddenException, re-throw it
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // For other errors (e.g., Keycloak connection issues), log and allow access
      // This prevents MFA verification from blocking access if Keycloak is unavailable
      // In production, you might want to be more strict here
      console.error('Error checking MFA status:', error);
      return true; // Fail open - allow access if MFA check fails
    }
  }
}
