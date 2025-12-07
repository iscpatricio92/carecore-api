import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PinoLogger } from 'nestjs-pino';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

import { User } from '../interfaces/user.interface';

/**
 * JWT Strategy for Keycloak token validation
 *
 * This strategy validates JWT tokens issued by Keycloak by:
 * 1. Extracting the token from the Authorization header (Bearer token)
 * 2. Obtaining the public key from Keycloak's JWKS endpoint
 * 3. Verifying the token signature and expiration
 * 4. Extracting user information from the token payload
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly keycloakUrl: string;
  private readonly keycloakRealm: string;
  private readonly jwksUri: string;
  private readonly issuer: string;
  private jwksClientInstance: jwksClient.JwksClient;

  constructor(
    private configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    // Get Keycloak configuration from environment
    const keycloakUrl = configService.get<string>('KEYCLOAK_URL') || '';
    const keycloakRealm = configService.get<string>('KEYCLOAK_REALM') || 'carecore';

    if (!keycloakUrl) {
      logger.warn(
        'KEYCLOAK_URL not set. JWT validation will fail. Set KEYCLOAK_URL in your environment variables.',
      );
    }

    // Construct JWKS URI and issuer
    const jwksUri = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/certs`;
    const issuer = `${keycloakUrl}/realms/${keycloakRealm}`;

    // Initialize JWKS client
    // jwks-rsa v3.x exports the function directly (not as default export)
    const jwksClientInstance = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });

    logger.setContext(JwtStrategy.name);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (
        request: unknown,
        rawJwtToken: string,
        done: (err: Error | null, key?: string) => void,
      ) => {
        // Use arrow function to access instance methods
        this.getKey(rawJwtToken, done);
      },
      issuer,
      algorithms: ['RS256'],
    });

    // Set instance properties after super()
    this.keycloakUrl = keycloakUrl;
    this.keycloakRealm = keycloakRealm;
    this.jwksUri = jwksUri;
    this.issuer = issuer;
    this.jwksClientInstance = jwksClientInstance;
  }

  /**
   * Get the public key from Keycloak JWKS endpoint
   * This method is called by passport-jwt to verify the token signature
   */
  private getKey(token: string, done: (err: Error | null, key?: string) => void): void {
    try {
      // Decode the token to get the kid (key ID)
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        return done(new UnauthorizedException('Invalid token format'));
      }

      const kid = decoded.header.kid;

      // Get the signing key from JWKS
      this.jwksClientInstance.getSigningKey(
        kid,
        (err: Error | null, key?: { getPublicKey(): string }) => {
          if (err) {
            this.logger.error({ err, kid }, 'Failed to get signing key from JWKS');
            return done(new UnauthorizedException('Failed to verify token signature'));
          }

          const signingKey = key?.getPublicKey();
          if (!signingKey) {
            return done(new UnauthorizedException('Signing key not found'));
          }

          done(null, signingKey);
        },
      );
    } catch (error) {
      this.logger.error({ error }, 'Error getting key from token');
      done(new UnauthorizedException('Invalid token'));
    }
  }

  /**
   * Validate and extract user information from JWT payload
   * This method is called after the token is successfully verified
   */
  async validate(payload: jwt.JwtPayload): Promise<User> {
    // Verify issuer
    if (payload.iss !== this.issuer) {
      this.logger.warn({ expected: this.issuer, received: payload.iss }, 'Token issuer mismatch');
      throw new UnauthorizedException('Invalid token issuer');
    }

    // Extract user information from token payload
    const keycloakUserId = payload.sub || '';
    const user: User = {
      id: keycloakUserId,
      keycloakUserId,
      username: payload.preferred_username || payload.sub || '',
      email: payload.email,
      roles: payload.realm_access?.roles || [],
      name: payload.name,
      givenName: payload.given_name,
      familyName: payload.family_name,
    };

    // Validate required fields
    if (!user.id || !user.username) {
      this.logger.warn({ payload }, 'Token missing required user information');
      throw new UnauthorizedException('Token missing required user information');
    }

    this.logger.debug({ userId: user.id, username: user.username }, 'User validated from token');

    return user;
  }
}
