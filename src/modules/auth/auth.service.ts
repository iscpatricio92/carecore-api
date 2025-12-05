import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { randomBytes } from 'node:crypto';
import { DocumentStorageService } from './services/document-storage.service';
import { KeycloakAdminService } from './services/keycloak-admin.service';
import { VerifyPractitionerDto } from './dto/verify-practitioner.dto';
import {
  ReviewVerificationDto,
  ReviewStatus,
  ListVerificationsQueryDto,
  VerificationDetailResponseDto,
  ListVerificationsResponseDto,
  ReviewVerificationResponseDto,
} from './dto/review-verification.dto';
import {
  PractitionerVerificationEntity,
  VerificationStatus,
} from '../../entities/practitioner-verification.entity';

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
    private readonly documentStorageService: DocumentStorageService,
    private readonly keycloakAdminService: KeycloakAdminService,
    @InjectRepository(PractitionerVerificationEntity)
    private readonly verificationRepository: Repository<PractitionerVerificationEntity>,
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
   * Validate state token for CSRF protection
   * @param receivedState State token received from Keycloak
   * @param storedState State token stored in cookie
   * @throws UnauthorizedException if state tokens don't match
   */
  validateStateToken(receivedState: string, storedState: string | undefined): void {
    if (!receivedState || !storedState) {
      this.logger.warn('State token missing in callback');
      throw new UnauthorizedException('Invalid state token');
    }

    if (receivedState !== storedState) {
      this.logger.warn('State token mismatch - possible CSRF attack');
      throw new UnauthorizedException('State token mismatch');
    }

    this.logger.debug('State token validated successfully');
  }

  /**
   * Exchange authorization code for tokens
   * @param code Authorization code from Keycloak
   * @param redirectUri Callback URL used in the authorization request
   * @returns Tokens (access, refresh) and user information
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'carecore';
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

    // Validate required configuration
    if (!keycloakUrl) {
      this.logger.error('KEYCLOAK_URL is not configured');
      throw new BadRequestException('Keycloak URL is not configured');
    }

    if (!clientId) {
      this.logger.error('KEYCLOAK_CLIENT_ID is not configured');
      throw new BadRequestException('Keycloak client ID is not configured');
    }

    if (!clientSecret) {
      this.logger.error('KEYCLOAK_CLIENT_SECRET is not configured');
      throw new BadRequestException('Keycloak client secret is not configured');
    }

    if (!code) {
      this.logger.error('Authorization code is required');
      throw new BadRequestException('Authorization code is required');
    }

    // Build token endpoint URL
    const tokenUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`;

    // Prepare request body
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', code);
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);
    body.append('redirect_uri', redirectUri);

    try {
      this.logger.debug({ tokenUrl, clientId }, 'Exchanging authorization code for tokens');

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          { status: response.status, error: errorText },
          'Failed to exchange code for tokens',
        );
        throw new UnauthorizedException('Failed to exchange authorization code for tokens');
      }

      const tokenData = await response.json();

      if (!tokenData.access_token) {
        this.logger.error({ tokenData }, 'Token response missing access_token');
        throw new UnauthorizedException('Invalid token response from Keycloak');
      }

      this.logger.debug('Successfully exchanged code for tokens');

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        expiresIn: tokenData.expires_in || 3600,
        tokenType: tokenData.token_type || 'Bearer',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error({ error }, 'Error exchanging code for tokens');
      throw new UnauthorizedException('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Get user information from Keycloak using access token
   * @param accessToken Access token from Keycloak
   * @returns User information
   */
  async getUserInfoFromKeycloak(accessToken: string): Promise<{
    id: string;
    username: string;
    email?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
  }> {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'carecore';

    if (!keycloakUrl) {
      throw new BadRequestException('Keycloak URL is not configured');
    }

    const userInfoUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/userinfo`;

    try {
      const response = await fetch(userInfoUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          { status: response.status, error: errorText },
          'Failed to get user info from Keycloak',
        );
        throw new UnauthorizedException('Failed to get user information');
      }

      const userInfo = await response.json();

      return {
        id: userInfo.sub || '',
        username: userInfo.preferred_username || userInfo.sub || '',
        email: userInfo.email,
        name: userInfo.name,
        givenName: userInfo.given_name,
        familyName: userInfo.family_name,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error({ error }, 'Error getting user info from Keycloak');
      throw new UnauthorizedException('Failed to get user information');
    }
  }

  /**
   * Handle OAuth2 callback from Keycloak
   * @param code Authorization code from Keycloak
   * @param state CSRF state token
   * @param storedState State token stored in cookie
   * @param redirectUri Callback URL used in the authorization request
   * @returns Tokens (access, refresh) and user information
   */
  async handleCallback(
    code: string,
    state: string,
    storedState: string | undefined,
    redirectUri: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    user: {
      id: string;
      username: string;
      email?: string;
      name?: string;
      givenName?: string;
      familyName?: string;
    };
  }> {
    // Validate state token (CSRF protection)
    this.validateStateToken(state, storedState);

    // Exchange authorization code for tokens
    const tokens = await this.exchangeCodeForTokens(code, redirectUri);

    // Get user information from Keycloak
    const user = await this.getUserInfoFromKeycloak(tokens.accessToken);

    this.logger.debug(
      { userId: user.id, username: user.username },
      'Callback handled successfully',
    );

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Refresh an access token using a refresh token
   * @param refreshToken Refresh token to exchange for new tokens
   * @returns New access token and refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }> {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'carecore';
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

    // Validate required configuration
    if (!keycloakUrl) {
      this.logger.error('KEYCLOAK_URL is not configured');
      throw new BadRequestException('Keycloak URL is not configured');
    }

    if (!clientId) {
      this.logger.error('KEYCLOAK_CLIENT_ID is not configured');
      throw new BadRequestException('Keycloak client ID is not configured');
    }

    if (!clientSecret) {
      this.logger.error('KEYCLOAK_CLIENT_SECRET is not configured');
      throw new BadRequestException('Keycloak client secret is not configured');
    }

    if (!refreshToken) {
      this.logger.error('Refresh token is required');
      throw new BadRequestException('Refresh token is required');
    }

    // Build token endpoint URL
    const tokenUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`;

    // Prepare request body
    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', refreshToken);
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);

    try {
      this.logger.debug({ tokenUrl, clientId }, 'Refreshing access token');

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error({ status: response.status, error: errorText }, 'Failed to refresh token');

        // Check if token is expired or invalid
        if (response.status === 400 || response.status === 401) {
          throw new UnauthorizedException('Refresh token is invalid or expired');
        }

        throw new UnauthorizedException('Failed to refresh access token');
      }

      const tokenData = await response.json();

      if (!tokenData.access_token) {
        this.logger.error({ tokenData }, 'Token response missing access_token');
        throw new UnauthorizedException('Invalid token response from Keycloak');
      }

      this.logger.debug('Successfully refreshed access token');

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep the old one
        expiresIn: tokenData.expires_in || 3600,
        tokenType: tokenData.token_type || 'Bearer',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error({ error }, 'Error refreshing token');
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Logout and revoke tokens in Keycloak
   * @param refreshToken Refresh token to revoke
   */
  async logout(refreshToken: string): Promise<void> {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'carecore';
    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

    // Validate required configuration
    if (!keycloakUrl) {
      this.logger.error('KEYCLOAK_URL is not configured');
      throw new BadRequestException('Keycloak URL is not configured');
    }

    if (!clientId) {
      this.logger.error('KEYCLOAK_CLIENT_ID is not configured');
      throw new BadRequestException('Keycloak client ID is not configured');
    }

    if (!clientSecret) {
      this.logger.error('KEYCLOAK_CLIENT_SECRET is not configured');
      throw new BadRequestException('Keycloak client secret is not configured');
    }

    if (!refreshToken) {
      this.logger.error('Refresh token is required for logout');
      throw new BadRequestException('Refresh token is required');
    }

    // Build logout endpoint URL
    const logoutUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/logout`;

    // Prepare request body
    const body = new URLSearchParams();
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);
    body.append('refresh_token', refreshToken);

    try {
      this.logger.debug({ logoutUrl, clientId }, 'Revoking tokens in Keycloak');

      const response = await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      // Keycloak logout endpoint returns 204 (No Content) on success
      // But it may also return 200 or 400/401 for invalid tokens
      // We consider it successful if status is 2xx
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          { status: response.status, error: errorText },
          'Failed to revoke tokens in Keycloak (may already be revoked)',
        );
        // Don't throw error - token may already be revoked or expired
        // Logout should still succeed locally
      } else {
        this.logger.debug('Tokens successfully revoked in Keycloak');
      }
    } catch (error) {
      // Don't throw error - allow logout to succeed even if Keycloak is unreachable
      // This ensures users can always log out locally
      this.logger.error(
        { error },
        'Error revoking tokens in Keycloak (continuing with local logout)',
      );
    }
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

  /**
   * Request practitioner verification
   * @param dto Verification request data
   * @param file Uploaded document file
   * @param userId Current user ID (from JWT)
   * @returns Verification request information
   */
  async requestVerification(
    dto: VerifyPractitionerDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<{
    verificationId: string;
    status: string;
    message: string;
    estimatedReviewTime: string;
  }> {
    // Validate file is provided
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    // Validate practitioner ID
    if (!dto.practitionerId || dto.practitionerId.trim() === '') {
      throw new BadRequestException('Practitioner ID is required');
    }

    // TODO: Validate that the practitioner exists in the system
    // TODO: Validate that the user has permission to verify this practitioner
    // (should be the practitioner themselves or an admin)

    // Store document
    const documentPath = await this.documentStorageService.storeVerificationDocument(
      file,
      dto.practitionerId,
      dto.documentType,
    );

    // Create verification record
    const verification = this.verificationRepository.create({
      practitionerId: dto.practitionerId,
      keycloakUserId: userId,
      documentType: dto.documentType,
      documentPath,
      status: VerificationStatus.PENDING,
      additionalInfo: dto.additionalInfo || null,
    });

    const savedVerification = await this.verificationRepository.save(verification);

    this.logger.info(
      {
        verificationId: savedVerification.id,
        practitionerId: dto.practitionerId,
        documentType: dto.documentType,
        documentPath,
        userId,
      },
      'Practitioner verification request submitted',
    );

    return {
      verificationId: savedVerification.id,
      status: savedVerification.status,
      message: 'Verification request submitted successfully',
      estimatedReviewTime: '2-3 business days',
    };
  }

  /**
   * List practitioner verifications with pagination and filters
   * @param query Query parameters (status, page, limit)
   * @returns Paginated list of verifications
   */
  async listVerifications(query: ListVerificationsQueryDto): Promise<ListVerificationsResponseDto> {
    const { status, page = 1, limit = 10 } = query;
    const queryBuilder = this.verificationRepository.createQueryBuilder('verification');

    // Filter by status if provided
    if (status) {
      queryBuilder.andWhere('verification.status = :status', { status });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const entities = await queryBuilder
      .orderBy('verification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const data: VerificationDetailResponseDto[] = entities.map((entity) => ({
      id: entity.id,
      practitionerId: entity.practitionerId,
      keycloakUserId: entity.keycloakUserId,
      documentType: entity.documentType,
      documentPath: entity.documentPath,
      status: entity.status,
      reviewedBy: entity.reviewedBy,
      reviewedAt: entity.reviewedAt,
      rejectionReason: entity.rejectionReason,
      additionalInfo: entity.additionalInfo,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }));

    const totalPages = Math.ceil(total / limit);

    this.logger.debug(
      { total, page, limit, status, totalPages },
      'Listed practitioner verifications',
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get verification details by ID
   * @param id Verification ID
   * @returns Verification details
   */
  async getVerificationById(id: string): Promise<VerificationDetailResponseDto> {
    const entity = await this.verificationRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException(`Verification with ID ${id} not found`);
    }

    return {
      id: entity.id,
      practitionerId: entity.practitionerId,
      keycloakUserId: entity.keycloakUserId,
      documentType: entity.documentType,
      documentPath: entity.documentPath,
      status: entity.status,
      reviewedBy: entity.reviewedBy,
      reviewedAt: entity.reviewedAt,
      rejectionReason: entity.rejectionReason,
      additionalInfo: entity.additionalInfo,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Review a practitioner verification (approve or reject)
   * @param id Verification ID
   * @param dto Review data
   * @param reviewerId Admin user ID who is reviewing
   * @returns Review result
   */
  async reviewVerification(
    id: string,
    dto: ReviewVerificationDto,
    reviewerId: string,
  ): Promise<ReviewVerificationResponseDto> {
    // Find verification
    const verification = await this.verificationRepository.findOne({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException(`Verification with ID ${id} not found`);
    }

    // Validate that verification is in pending status
    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        `Verification is already ${verification.status}. Only pending verifications can be reviewed.`,
      );
    }

    // Validate rejection reason if status is rejected
    if (dto.status === ReviewStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a verification');
    }

    // Update verification
    const newStatus =
      dto.status === ReviewStatus.APPROVED
        ? VerificationStatus.APPROVED
        : VerificationStatus.REJECTED;

    verification.status = newStatus;
    verification.reviewedBy = reviewerId;
    verification.reviewedAt = new Date();
    verification.rejectionReason = dto.rejectionReason || null;

    const updatedVerification = await this.verificationRepository.save(verification);

    this.logger.info(
      {
        verificationId: id,
        status: newStatus,
        reviewerId,
        practitionerId: verification.practitionerId,
      },
      'Practitioner verification reviewed',
    );

    // Update Keycloak roles based on verification status
    if (verification.keycloakUserId) {
      try {
        if (newStatus === VerificationStatus.APPROVED) {
          // Add practitioner-verified role
          const roleAdded = await this.keycloakAdminService.addRoleToUser(
            verification.keycloakUserId,
            'practitioner-verified',
          );

          if (!roleAdded) {
            this.logger.warn(
              {
                verificationId: id,
                keycloakUserId: verification.keycloakUserId,
              },
              'Failed to add practitioner-verified role in Keycloak. Verification was approved in database but role update failed.',
            );
            // Note: We don't rollback the database change because the verification was legitimately approved
            // The admin can manually add the role in Keycloak if needed
          } else {
            this.logger.info(
              {
                verificationId: id,
                keycloakUserId: verification.keycloakUserId,
              },
              'Added practitioner-verified role to user in Keycloak',
            );
          }
        } else if (newStatus === VerificationStatus.REJECTED) {
          // Remove practitioner-verified role if it exists
          const roleRemoved = await this.keycloakAdminService.removeRoleFromUser(
            verification.keycloakUserId,
            'practitioner-verified',
          );

          if (roleRemoved) {
            this.logger.info(
              {
                verificationId: id,
                keycloakUserId: verification.keycloakUserId,
              },
              'Removed practitioner-verified role from user in Keycloak',
            );
          }
          // If role didn't exist, that's fine - no action needed
        }
      } catch (error) {
        this.logger.error(
          {
            error,
            verificationId: id,
            keycloakUserId: verification.keycloakUserId,
            status: newStatus,
          },
          'Error updating Keycloak roles during verification review',
        );
        // Don't throw - the database update was successful, Keycloak update can be done manually
      }
    } else {
      this.logger.warn(
        {
          verificationId: id,
        },
        'Cannot update Keycloak roles: keycloakUserId is not set',
      );
    }

    return {
      verificationId: updatedVerification.id,
      status: updatedVerification.status,
      reviewedBy: updatedVerification.reviewedBy!,
      reviewedAt: updatedVerification.reviewedAt!.toISOString(),
      message:
        newStatus === VerificationStatus.APPROVED
          ? 'Verification approved successfully'
          : 'Verification rejected',
    };
  }
}
