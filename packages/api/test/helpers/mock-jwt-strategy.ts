import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';

import { User } from '@carecore/shared';

/**
 * Mock JWT Strategy for E2E Tests
 * Uses a simple secret instead of Keycloak JWKS validation
 *
 * SECURITY NOTE: This strategy is ONLY for testing purposes.
 * The secret 'test-secret-key-for-e2e-tests-only' should NEVER be used in production.
 * This strategy bypasses Keycloak validation and should only be used in test environments.
 */
@Injectable()
export class MockJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'test-secret-key-for-e2e-tests-only',
      algorithms: ['HS256'], // Use HS256 for test tokens instead of RS256
      // Don't validate issuer for test tokens
      issuer: undefined,
    });
  }

  async validate(payload: jwt.JwtPayload): Promise<User> {
    // Extract user information from token payload
    const keycloakUserId = payload.sub || '';

    // Extract scopes from token (can be in 'scope' or 'scp' field)
    // Keycloak typically uses 'scope' as a space-separated string
    const scopeString = payload.scope || payload.scp || '';
    const scopes = scopeString ? scopeString.split(' ').filter((s: string) => s.length > 0) : [];

    const user: User = {
      id: keycloakUserId,
      keycloakUserId,
      username: payload.preferred_username || payload.sub || '',
      email: payload.email,
      roles: payload.realm_access?.roles || [],
      name: payload.name,
      givenName: payload.given_name,
      familyName: payload.family_name,
      scopes,
    };

    // Validate required fields
    if (!user.id || !user.username) {
      throw new Error('Token missing required user information');
    }

    return user;
  }
}
