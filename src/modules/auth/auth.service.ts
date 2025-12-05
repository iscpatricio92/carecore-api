import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { randomBytes } from 'node:crypto';

/**
 * Auth Service
 *
 * Handles authentication business logic including:
 * - OAuth2/OIDC flow with Keycloak
 * - Token management (access, refresh, revocation)
 * - User information retrieval
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  /**
   * Generate a secure random state token for CSRF protection
   * @returns Base64-encoded random token
   */
  generateStateToken(): string {
    // Generate 32 random bytes and encode as base64
    const randomBytesBuffer = randomBytes(32);
    return randomBytesBuffer.toString('base64url');
  }

  /**
   * Get the Keycloak authorization URL for OAuth2 login
   * @param stateToken CSRF state token for security
   * @param redirectUri Callback URL where Keycloak will redirect after authentication
   * @returns Authorization URL with OAuth2 parameters
   */
  getAuthorizationUrl(stateToken: string, redirectUri: string): string {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'carecore';
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');

    // Validate required configuration
    if (!keycloakUrl) {
      this.logger.error('KEYCLOAK_URL is not configured');
      throw new BadRequestException('Keycloak URL is not configured');
    }

    if (!clientId) {
      this.logger.error('KEYCLOAK_CLIENT_ID is not configured');
      throw new BadRequestException('Keycloak client ID is not configured');
    }

    if (!stateToken) {
      this.logger.error('State token is required');
      throw new BadRequestException('State token is required');
    }

    if (!redirectUri) {
      this.logger.error('Redirect URI is required');
      throw new BadRequestException('Redirect URI is required');
    }

    // Build OAuth2 authorization URL
    const authUrl = new URL(`${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/auth`);

    // Add OAuth2 parameters
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', stateToken);

    this.logger.debug(
      { keycloakUrl, realm: keycloakRealm, clientId },
      'Generated Keycloak authorization URL',
    );

    return authUrl.toString();
  }

  /**
   * Handle OAuth2 callback from Keycloak
   * @param code Authorization code from Keycloak
   * @param state CSRF state token
   * @returns Tokens (access, refresh) and user information
   */
  async handleCallback(
    _code: string,
    _state: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: unknown;
  }> {
    // TODO: Implement in Tarea 9
    this.logger.warn('handleCallback() not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * Refresh an access token using a refresh token
   * @param refreshToken Refresh token
   * @returns New access token and refresh token
   */
  async refreshToken(_refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // TODO: Implement in Tarea 10
    this.logger.warn('refreshToken() not yet implemented');
    throw new Error('Not implemented');
  }

  /**
   * Logout and revoke tokens
   * @param refreshToken Refresh token to revoke
   */
  async logout(_refreshToken: string): Promise<void> {
    // TODO: Implement in Tarea 11
    this.logger.warn('logout() not yet implemented');
  }

  /**
   * Get user information from Keycloak
   * @param accessToken Access token
   * @returns User information
   */
  async getUserInfo(_accessToken: string): Promise<unknown> {
    // TODO: Implement in Tarea 12
    this.logger.warn('getUserInfo() not yet implemented');
    throw new Error('Not implemented');
  }
}
