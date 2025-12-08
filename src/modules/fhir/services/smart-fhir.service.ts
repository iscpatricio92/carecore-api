import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { randomBytes } from 'crypto';
import { KeycloakAdminService } from '../../auth/services/keycloak-admin.service';
import { FhirErrorService } from '../../../common/services/fhir-error.service';
import { SmartFhirAuthDto } from '../../../common/dto/smart-fhir-auth.dto';
import { SmartFhirTokenDto } from '../../../common/dto/smart-fhir-token.dto';
import { SmartFhirLaunchDto } from '../../../common/dto/smart-fhir-launch.dto';

/**
 * Service for handling SMART on FHIR authorization flows
 * Implements OAuth2 Authorization Code Flow for SMART on FHIR applications
 */
/**
 * Launch context stored temporarily
 */
interface LaunchContext {
  patient?: string;
  encounter?: string;
  practitioner?: string;
  needPatientBanner?: boolean;
  needSmartStyleResponse?: boolean;
  timestamp: number;
}

@Injectable()
export class SmartFhirService {
  // In-memory storage for launch contexts (key: launch token, value: context)
  // In production, consider using Redis or a distributed cache
  private readonly launchContexts = new Map<string, LaunchContext>();

  // TTL for launch contexts: 10 minutes (600000 ms)
  private readonly LAUNCH_CONTEXT_TTL = 10 * 60 * 1000;

  // Store interval ID so we can clear it if needed (e.g., in tests)
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {
    this.logger.setContext(SmartFhirService.name);
    // Clean up expired contexts every 5 minutes
    this.cleanupIntervalId = setInterval(() => this.cleanupExpiredContexts(), 5 * 60 * 1000);
  }

  /**
   * Clean up the interval (useful for testing)
   */
  onModuleDestroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }

  /**
   * Generate a state token for CSRF protection
   * @returns Base64URL-encoded random token
   */
  generateStateToken(): string {
    const randomBytesBuffer = randomBytes(32);
    return randomBytesBuffer.toString('base64url');
  }

  /**
   * Validate OAuth2 authorization parameters
   * @param params Authorization parameters
   * @throws BadRequestException if validation fails
   */
  async validateAuthParams(params: SmartFhirAuthDto): Promise<void> {
    // Validate response_type
    if (params.response_type !== 'code') {
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          400,
          'Invalid response_type. Only "code" is supported for Authorization Code flow.',
          undefined,
          ['response_type'],
        ),
      );
    }

    // Validate client exists in Keycloak
    const client = await this.keycloakAdminService.findClientById(params.client_id);
    if (!client) {
      throw new UnauthorizedException(
        FhirErrorService.createOperationOutcome(
          401,
          `Client "${params.client_id}" not found or not configured.`,
          'The client_id provided does not exist in the authorization server.',
          ['client_id'],
        ),
      );
    }

    // Validate that Standard Flow is enabled for the client
    if (!client.standardFlowEnabled) {
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          400,
          `Client "${params.client_id}" does not have Authorization Code flow enabled.`,
          'The client must have Standard Flow enabled to use this authorization endpoint.',
          ['client_id'],
        ),
      );
    }

    // Validate redirect_uri is registered for the client
    const isValidRedirectUri = await this.keycloakAdminService.validateRedirectUri(
      params.client_id,
      params.redirect_uri,
    );

    if (!isValidRedirectUri) {
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          400,
          `Redirect URI "${params.redirect_uri}" is not registered for client "${params.client_id}".`,
          'The redirect_uri must be one of the valid redirect URIs configured for the client.',
          ['redirect_uri'],
        ),
      );
    }

    // Validate scope format (basic validation - should contain at least one scope)
    if (!params.scope || params.scope.trim().length === 0) {
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          400,
          'Scope parameter is required and cannot be empty.',
          undefined,
          ['scope'],
        ),
      );
    }

    // Validate scope contains valid characters (letters, numbers, colons, spaces)
    const scopePattern = /^[a-zA-Z0-9:\s]+$/;
    if (!scopePattern.test(params.scope)) {
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          400,
          'Invalid scope format. Scopes must contain only letters, numbers, colons, and spaces.',
          undefined,
          ['scope'],
        ),
      );
    }
  }

  /**
   * Build Keycloak authorization URL for SMART on FHIR
   * @param params Authorization parameters
   * @param stateToken CSRF state token
   * @param callbackUrl Our callback URL where Keycloak will redirect after authentication
   * @returns Authorization URL to redirect to
   */
  buildAuthorizationUrl(params: SmartFhirAuthDto, stateToken: string, callbackUrl: string): string {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'carecore';

    if (!keycloakUrl) {
      this.logger.error('KEYCLOAK_URL is not configured');
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          500,
          'Authorization server configuration error.',
          'KEYCLOAK_URL is not configured.',
        ),
      );
    }

    // Build OAuth2 authorization URL
    const authUrl = new URL(`${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/auth`);

    // Add required OAuth2 parameters
    authUrl.searchParams.set('client_id', params.client_id);
    authUrl.searchParams.set('response_type', params.response_type);
    // Use our callback URL, not the client's redirect_uri
    // We'll redirect to the client's redirect_uri after processing the code
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('scope', params.scope);
    // Store the client's redirect_uri and original state in our state token
    // Format: base64(originalState|clientRedirectUri)
    const stateData = {
      state: params.state || stateToken,
      clientRedirectUri: params.redirect_uri,
    };
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64url');
    authUrl.searchParams.set('state', encodedState);

    // Add audience if provided (SMART on FHIR extension)
    if (params.aud) {
      authUrl.searchParams.set('aud', params.aud);
    }

    this.logger.debug(
      {
        clientId: params.client_id,
        callbackUrl,
        clientRedirectUri: params.redirect_uri,
        scope: params.scope,
      },
      'Generated Keycloak authorization URL for SMART on FHIR',
    );

    return authUrl.toString();
  }

  /**
   * Get the callback URL where Keycloak will redirect after authorization
   * This should be the endpoint that handles the authorization code exchange
   * @param request Request object to determine protocol and host
   * @returns Callback URL
   */
  getCallbackUrl(request: {
    protocol?: string;
    get?: (header: string) => string | undefined;
  }): string {
    const protocol = request.protocol || 'http';
    const host = request.get?.('host') || 'localhost:3000';
    const apiPrefix = this.configService.get<string>('API_PREFIX') || '/api';

    return `${protocol}://${host}${apiPrefix}/fhir/token`;
  }

  /**
   * Decode state token to extract original state and client redirect URI
   * @param encodedState Base64URL-encoded state token
   * @returns Decoded state data
   */
  decodeStateToken(encodedState: string): { state: string; clientRedirectUri: string } | null {
    try {
      const decoded = Buffer.from(encodedState, 'base64url').toString('utf-8');
      const stateData = JSON.parse(decoded);
      return {
        state: stateData.state,
        clientRedirectUri: stateData.clientRedirectUri,
      };
    } catch (error) {
      this.logger.warn({ error, encodedState }, 'Failed to decode state token');
      return null;
    }
  }

  /**
   * Validate token request parameters
   * @param params Token request parameters
   * @throws BadRequestException if validation fails
   */
  async validateTokenParams(params: SmartFhirTokenDto): Promise<void> {
    // Validate grant_type
    if (!['authorization_code', 'refresh_token'].includes(params.grant_type)) {
      throw new BadRequestException({
        error: 'unsupported_grant_type',
        error_description: 'Grant type must be "authorization_code" or "refresh_token"',
      });
    }

    // Validate client exists
    const client = await this.keycloakAdminService.findClientById(params.client_id);
    if (!client) {
      throw new UnauthorizedException({
        error: 'invalid_client',
        error_description: `Client "${params.client_id}" not found`,
      });
    }

    // Validate grant_type specific parameters
    if (params.grant_type === 'authorization_code') {
      if (!params.code) {
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'code parameter is required for authorization_code grant',
        });
      }

      if (!params.redirect_uri) {
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'redirect_uri parameter is required for authorization_code grant',
        });
      }

      // Validate redirect_uri matches registered URIs
      const isValidRedirectUri = await this.keycloakAdminService.validateRedirectUri(
        params.client_id,
        params.redirect_uri,
      );

      if (!isValidRedirectUri) {
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: `Redirect URI "${params.redirect_uri}" is not registered for client`,
        });
      }
    } else if (params.grant_type === 'refresh_token') {
      if (!params.refresh_token) {
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: 'refresh_token parameter is required for refresh_token grant',
        });
      }
    }
  }

  /**
   * Exchange authorization code for tokens with Keycloak
   * @param params Token request parameters
   * @param callbackUrl Our callback URL used in the authorization request
   * @returns OAuth2 token response
   */
  async exchangeCodeForTokens(
    params: SmartFhirTokenDto,
    callbackUrl: string,
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    patient?: string;
  }> {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'carecore';

    if (!keycloakUrl) {
      throw new BadRequestException({
        error: 'server_error',
        error_description: 'Authorization server configuration error',
      });
    }

    // Get client secret from Keycloak Admin API
    const client = await this.keycloakAdminService.findClientById(params.client_id);
    if (!client || !client.id) {
      throw new UnauthorizedException({
        error: 'invalid_client',
        error_description: 'Client not found',
      });
    }

    // For now, we'll use client_secret from params
    // In production, you might want to retrieve it from Keycloak Admin API
    const clientSecret = params.client_secret;

    // Build token endpoint URL
    const tokenUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`;

    // Prepare request body
    const body = new URLSearchParams();
    body.append('grant_type', params.grant_type);
    body.append('client_id', params.client_id);

    if (params.grant_type === 'authorization_code') {
      body.append('code', params.code!);
      body.append('redirect_uri', callbackUrl);
      if (clientSecret) {
        body.append('client_secret', clientSecret);
      }
    } else if (params.grant_type === 'refresh_token') {
      body.append('refresh_token', params.refresh_token!);
      if (clientSecret) {
        body.append('client_secret', clientSecret);
      }
    }

    try {
      this.logger.debug(
        { clientId: params.client_id, grantType: params.grant_type },
        'Exchanging code for tokens with Keycloak',
      );

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'unknown_error' }));
        this.logger.error(
          { status: response.status, error: errorData },
          'Failed to exchange code for tokens',
        );
        throw new UnauthorizedException({
          error: errorData.error || 'invalid_grant',
          error_description: errorData.error_description || 'Failed to exchange authorization code',
        });
      }

      const tokenData = await response.json();

      if (!tokenData.access_token) {
        throw new UnauthorizedException({
          error: 'invalid_grant',
          error_description: 'Token response missing access_token',
        });
      }

      // Extract patient context from token if available (SMART on FHIR extension)
      // The patient context is typically in the token claims or can be extracted from scopes
      const patientContext = this.extractPatientContext(tokenData);

      this.logger.debug({ clientId: params.client_id }, 'Successfully exchanged code for tokens');

      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_in: tokenData.expires_in || 3600,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        patient: patientContext,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error({ error }, 'Error exchanging code for tokens');
      throw new UnauthorizedException({
        error: 'server_error',
        error_description: 'Failed to exchange authorization code for tokens',
      });
    }
  }

  /**
   * Extract patient context from token data (SMART on FHIR extension)
   * @param tokenData Token response from Keycloak
   * @returns Patient ID if available, undefined otherwise
   */
  private extractPatientContext(tokenData: {
    access_token?: string;
    scope?: string;
  }): string | undefined {
    // In SMART on FHIR, patient context can be:
    // 1. In the token claims (decoded JWT)
    // 2. Inferred from scopes (e.g., patient/123.*)
    // 3. In the token response

    // For now, we'll try to extract from scopes
    // Scopes like "patient/123.read" indicate patient context
    if (tokenData.scope) {
      const patientScopeMatch = tokenData.scope.match(/patient\/([^.\s]+)/);
      if (patientScopeMatch) {
        return patientScopeMatch[1];
      }
    }

    // TODO: Decode JWT and extract patient context from claims
    // This would require JWT decoding and parsing

    return undefined;
  }

  /**
   * Validate launch sequence parameters
   * @param params Launch parameters
   * @throws BadRequestException if validation fails
   */
  async validateLaunchParams(params: SmartFhirLaunchDto): Promise<void> {
    // Validate issuer matches our FHIR server URL
    const fhirServerUrl = this.configService.get<string>('FHIR_SERVER_URL');
    if (fhirServerUrl && params.iss !== fhirServerUrl) {
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          400,
          `Issuer "${params.iss}" does not match the FHIR server URL.`,
          undefined,
          ['iss'],
        ),
      );
    }

    // Validate client exists
    const client = await this.keycloakAdminService.findClientById(params.client_id);
    if (!client) {
      throw new UnauthorizedException(
        FhirErrorService.createOperationOutcome(
          401,
          `Client "${params.client_id}" not found or not configured.`,
          'The client_id provided does not exist in the authorization server.',
          ['client_id'],
        ),
      );
    }

    // Validate redirect_uri is registered for the client
    const isValidRedirectUri = await this.keycloakAdminService.validateRedirectUri(
      params.client_id,
      params.redirect_uri,
    );

    if (!isValidRedirectUri) {
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          400,
          `Redirect URI "${params.redirect_uri}" is not registered for client "${params.client_id}".`,
          'The redirect_uri must be one of the valid redirect URIs configured for the client.',
          ['redirect_uri'],
        ),
      );
    }

    // Validate scope format
    if (!params.scope || params.scope.trim().length === 0) {
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          400,
          'Scope parameter is required and cannot be empty.',
          undefined,
          ['scope'],
        ),
      );
    }
  }

  /**
   * Validate and decode launch token
   * In a real implementation, this would verify the token signature and expiration
   * For now, we'll use a simple validation and extract context from the token
   * @param launchToken Launch token from EHR
   * @returns Launch context (patient, encounter, etc.)
   */
  async validateAndDecodeLaunchToken(launchToken: string): Promise<LaunchContext> {
    try {
      // In a real implementation, the launch token would be:
      // 1. A JWT signed by the EHR
      // 2. Or an opaque token that we exchange with the EHR for context
      // For now, we'll decode it as base64url JSON (simplified approach)
      // In production, you should verify the signature and expiration

      const decoded = Buffer.from(launchToken, 'base64url').toString('utf-8');
      const context = JSON.parse(decoded) as LaunchContext;

      // Validate required fields and set timestamp
      const launchContext: LaunchContext = {
        patient: context.patient,
        encounter: context.encounter,
        practitioner: context.practitioner,
        needPatientBanner: context.needPatientBanner,
        needSmartStyleResponse: context.needSmartStyleResponse,
        timestamp: Date.now(),
      };

      this.logger.debug({ launchToken, context: launchContext }, 'Launch token decoded');

      return launchContext;
    } catch (error) {
      this.logger.warn({ error, launchToken }, 'Failed to decode launch token');
      throw new BadRequestException(
        FhirErrorService.createOperationOutcome(
          400,
          'Invalid launch token format.',
          'The launch token provided is not in a valid format.',
          ['launch'],
        ),
      );
    }
  }

  /**
   * Store launch context temporarily
   * @param launchToken Launch token (used as key)
   * @param context Launch context to store
   */
  storeLaunchContext(launchToken: string, context: LaunchContext): void {
    this.launchContexts.set(launchToken, context);
    this.logger.debug({ launchToken, context }, 'Launch context stored');
  }

  /**
   * Retrieve launch context by token
   * @param launchToken Launch token
   * @returns Launch context or null if not found/expired
   */
  getLaunchContext(launchToken: string): LaunchContext | null {
    const context = this.launchContexts.get(launchToken);

    if (!context) {
      return null;
    }

    // Check if context has expired
    const age = Date.now() - context.timestamp;
    if (age > this.LAUNCH_CONTEXT_TTL) {
      this.launchContexts.delete(launchToken);
      this.logger.debug({ launchToken, age }, 'Launch context expired');
      return null;
    }

    return context;
  }

  /**
   * Remove launch context (after use)
   * @param launchToken Launch token
   */
  removeLaunchContext(launchToken: string): void {
    this.launchContexts.delete(launchToken);
    this.logger.debug({ launchToken }, 'Launch context removed');
  }

  /**
   * Clean up expired launch contexts
   */
  private cleanupExpiredContexts(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, context] of this.launchContexts.entries()) {
      const age = now - context.timestamp;
      if (age > this.LAUNCH_CONTEXT_TTL) {
        this.launchContexts.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug({ cleaned }, 'Cleaned up expired launch contexts');
    }
  }
}
