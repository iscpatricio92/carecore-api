import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for public routes
 * Used to mark endpoints that don't require authentication
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public Decorator
 *
 * Marks an endpoint as public, allowing access without authentication.
 * This decorator should be used on endpoints that don't require JWT tokens,
 * such as health checks, metadata endpoints, or public documentation.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
