import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { randomBytes } from 'crypto';
import { KeycloakAdminService } from '../../auth/services/keycloak-admin.service';
import { FhirErrorService } from '../../../common/services/fhir-error.service';
import { SmartFhirAuthDto } from '../../../common/dto/smart-fhir-auth.dto';

/**
 * Service for handling SMART on FHIR authorization flows
 * Implements OAuth2 Authorization Code Flow for SMART on FHIR applications
 */
@Injectable()
export class SmartFhirService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {
    this.logger.setContext(SmartFhirService.name);
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
}
