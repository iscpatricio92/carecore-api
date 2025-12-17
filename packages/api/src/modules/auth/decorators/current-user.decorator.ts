import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { User } from '@carecore/shared';

/**
 * CurrentUser Decorator
 *
 * Extracts the authenticated user from the request object.
 * This decorator should be used in protected endpoints where the user
 * has been authenticated by the JwtAuthGuard.
 *
 * The user object is populated by the JwtStrategy after validating the JWT token.
 *
 * @param data - Optional parameter to specify which property of the user to extract
 * @param ctx - Execution context containing the request
 * @returns The authenticated user object or a specific property if specified
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 * ```
 *
 * @throws {UnauthorizedException} If no user is found in the request (should not happen in protected endpoints)
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | User[keyof User] => {
    const request = ctx.switchToHttp().getRequest();
    const user: User | undefined = request.user;

    // If no user is found, throw an error
    // This should not happen in protected endpoints, but provides safety
    if (!user) {
      throw new UnauthorizedException(
        'User not found in request. Ensure the endpoint is protected by JwtAuthGuard.',
      );
    }

    // If a specific property is requested, return that property
    if (data) {
      return user[data];
    }

    // Otherwise, return the entire user object
    return user;
  },
);
