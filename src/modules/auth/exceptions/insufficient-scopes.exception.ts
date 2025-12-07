import { ForbiddenException } from '@nestjs/common';

/**
 * Exception thrown when a user doesn't have the required scopes to access a resource
 */
export class InsufficientScopesException extends ForbiddenException {
  constructor(requiredScopes: string[], userScopes: string[]) {
    const message = `Insufficient scopes. Required: ${requiredScopes.join(', ')}. User has: ${userScopes.length > 0 ? userScopes.join(', ') : 'none'}.`;

    super({
      statusCode: 403,
      message,
      error: 'Forbidden',
      requiredScopes,
      userScopes,
    });
  }
}
