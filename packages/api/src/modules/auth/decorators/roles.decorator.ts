import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for roles
 * Used to mark endpoints that require specific roles
 */
export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 *
 * Defines which roles are required to access an endpoint.
 * This decorator should be used together with `RolesGuard` to protect endpoints
 * based on user roles extracted from the JWT token.
 *
 * The user must have at least one of the specified roles to access the endpoint.
 *
 * @param roles - Array of role names required to access the endpoint
 * @returns A decorator that sets metadata for role-based access control
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
 *
 * @example
 * ```typescript
 * @Get('practitioner')
 * @Roles('practitioner', 'admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async practitionerEndpoint() {
 *   return { message: 'Practitioner or admin' };
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
