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
import * as QRCode from 'qrcode';
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
import {
  SetupMFAResponseDto,
  VerifyMFAResponseDto,
  DisableMFAResponseDto,
  MFAStatusResponseDto,
} from './dto/mfa.dto';
import { ROLES } from '@/common/constants/roles';
import { FhirService } from '../fhir/fhir.service';
import { EncryptionService } from '@/common/services/encryption.service';
import { RegisterPatientDto, RegisterPatientResponseDto } from './dto/register-patient.dto';
import { CreatePatientDto } from '@/common/dto/fhir-patient.dto';

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
    private readonly fhirService: FhirService,
    private readonly encryptionService: EncryptionService,
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
    if (!receivedState || !receivedState.trim() || !storedState || !storedState.trim()) {
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

    if (!code || code.trim() === '') {
      this.logger.error('Authorization code is required');
      throw new BadRequestException('Authorization code is required');
    }

    if (!redirectUri || redirectUri.trim() === '') {
      this.logger.error('Redirect URI is required');
      throw new BadRequestException('Redirect URI is required');
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

    if (!accessToken || accessToken.trim() === '') {
      throw new BadRequestException('Access token is required');
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

  /**
   * Setup MFA for a user
   * Generates TOTP secret and QR code for the user to scan with authenticator app
   * @param userId Keycloak user ID
   * @param userEmail User email for QR code label
   * @returns Setup MFA response with secret and QR code
   */
  async setupMFA(userId: string, userEmail: string): Promise<SetupMFAResponseDto> {
    this.logger.info({ userId }, 'Setting up MFA for user');

    // Check if user already has MFA configured
    const hasMFA = await this.keycloakAdminService.userHasMFA(userId);
    if (hasMFA) {
      throw new BadRequestException('MFA is already configured for this user');
    }

    // Generate TOTP secret from Keycloak
    const totpData = await this.keycloakAdminService.generateTOTPSecret(userId);
    if (!totpData || !totpData.secret) {
      throw new BadRequestException('Failed to generate TOTP secret');
    }

    const secret = totpData.secret;

    // Generate QR code
    // Format: otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}
    const keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'carecore';
    const issuer = `CareCore (${keycloakRealm})`;
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
      userEmail,
    )}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    let qrCode: string;
    try {
      qrCode = await QRCode.toDataURL(otpAuthUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate QR code');
      throw new BadRequestException('Failed to generate QR code');
    }

    this.logger.info({ userId }, 'MFA setup completed successfully');

    return {
      secret,
      qrCode,
      manualEntryKey: secret,
      message: 'Scan the QR code with your authenticator app',
    };
  }

  /**
   * Verify MFA setup and enable MFA for user
   * Validates the TOTP code and enables MFA permanently in Keycloak
   * @param userId Keycloak user ID
   * @param code TOTP code from authenticator app
   * @returns Verification response
   */
  async verifyMFASetup(userId: string, code: string): Promise<VerifyMFAResponseDto> {
    this.logger.info({ userId }, 'Verifying MFA setup for user');

    // Check if user already has MFA configured
    const hasMFA = await this.keycloakAdminService.userHasMFA(userId);
    if (hasMFA) {
      throw new BadRequestException('MFA is already enabled for this user');
    }

    // Verify TOTP code and enable MFA in Keycloak
    const isValid = await this.keycloakAdminService.verifyAndEnableTOTP(userId, code);
    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code. Please try again.');
    }

    this.logger.info({ userId }, 'MFA verified and enabled successfully');

    return {
      success: true,
      message: 'MFA enabled successfully',
      mfaEnabled: true,
    };
  }

  /**
   * Disable MFA for user
   * Requires valid TOTP code for security
   * @param userId Keycloak user ID
   * @param code Current TOTP code for verification
   * @returns Disable response
   */
  async disableMFA(userId: string, code: string): Promise<DisableMFAResponseDto> {
    this.logger.info({ userId }, 'Disabling MFA for user');

    // Check if user has MFA configured
    const hasMFA = await this.keycloakAdminService.userHasMFA(userId);
    if (!hasMFA) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    // Verify TOTP code before disabling
    const isValid = await this.keycloakAdminService.verifyTOTPCode(userId, code);
    if (!isValid) {
      throw new BadRequestException(
        'Invalid TOTP code. Please provide a valid code to disable MFA.',
      );
    }

    // Remove TOTP credential from user
    const removed = await this.keycloakAdminService.removeTOTPCredential(userId);
    if (!removed) {
      throw new BadRequestException('Failed to disable MFA. Please try again.');
    }

    this.logger.info({ userId }, 'MFA disabled successfully');

    return {
      success: true,
      message: 'MFA disabled successfully',
      mfaEnabled: false,
    };
  }

  /**
   * Get MFA status for user
   * @param userId Keycloak user ID
   * @returns MFA status information
   */
  async getMFAStatus(userId: string): Promise<MFAStatusResponseDto> {
    const criticalRoles = [ROLES.ADMIN, ROLES.PRACTITIONER];

    // Get user from Keycloak to check roles
    const user = await this.keycloakAdminService.findUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found in Keycloak`);
    }

    // Get user roles
    const userRoles = await this.keycloakAdminService.getUserRoles(userId);

    // Check if user has critical role
    const hasCriticalRole = criticalRoles.some((role) => userRoles.includes(role));

    // Check MFA status
    const mfaEnabled = await this.keycloakAdminService.userHasMFA(userId);

    return {
      mfaEnabled,
      mfaRequired: hasCriticalRole,
      message:
        hasCriticalRole && !mfaEnabled
          ? 'MFA is required for your role. Please configure MFA to access protected endpoints.'
          : mfaEnabled
            ? 'MFA is enabled and active'
            : 'MFA is optional for your role',
    };
  }

  /**
   * Register a new patient
   * Creates user in Keycloak, validates identifier uniqueness, encrypts sensitive data, and creates Patient resource
   * @param registerDto Patient registration data
   * @returns Registration response with user ID and patient ID
   */
  async registerPatient(registerDto: RegisterPatientDto): Promise<RegisterPatientResponseDto> {
    try {
      // Step 1: Check if username or email already exists in Keycloak
      const userExists = await this.keycloakAdminService.checkUserExists(
        registerDto.username,
        registerDto.email,
      );

      if (userExists.usernameExists) {
        throw new BadRequestException('Username already exists');
      }

      if (userExists.emailExists) {
        throw new BadRequestException('Email already exists');
      }

      // Step 2: Validate uniqueness of patient identifiers (SSN, medical record number, etc.)
      if (registerDto.identifier && registerDto.identifier.length > 0) {
        await this.fhirService.validatePatientIdentifierUniqueness(registerDto.identifier);
      }

      // Step 3: Extract name parts for Keycloak
      const firstName = registerDto.name?.[0]?.given?.[0] || '';
      const lastName = registerDto.name?.[0]?.family || '';

      // Step 4: Create user in Keycloak
      const keycloakUserId = await this.keycloakAdminService.createUser({
        username: registerDto.username,
        email: registerDto.email,
        password: registerDto.password,
        firstName,
        lastName,
        enabled: true,
        emailVerified: false, // User should verify email
      });

      if (!keycloakUserId) {
        throw new BadRequestException('Failed to create user in Keycloak');
      }

      // Step 5: Assign 'patient' role to the user
      const roleAssigned = await this.keycloakAdminService.addRoleToUser(
        keycloakUserId,
        ROLES.PATIENT,
      );
      if (!roleAssigned) {
        this.logger.warn(
          { userId: keycloakUserId },
          'Failed to assign patient role, but user was created',
        );
        // Continue even if role assignment fails - user can be assigned role later
      }

      // Step 6: Encrypt sensitive information in patient data
      const encryptedPatientData = await this.encryptSensitivePatientData(registerDto);

      // Step 7: Create Patient resource in database
      const createPatientDto: CreatePatientDto = {
        identifier: encryptedPatientData.identifier as CreatePatientDto['identifier'],
        name: registerDto.name,
        telecom: encryptedPatientData.telecom as CreatePatientDto['telecom'],
        gender: registerDto.gender,
        birthDate: registerDto.birthDate,
        address: encryptedPatientData.address as CreatePatientDto['address'],
        active: registerDto.active ?? true,
      };

      // Create patient with the Keycloak user ID linked
      const patient = await this.fhirService.createPatient(createPatientDto, {
        id: keycloakUserId,
        keycloakUserId: keycloakUserId,
        username: registerDto.username,
        email: registerDto.email,
        roles: [ROLES.PATIENT],
        scopes: [],
      });

      this.logger.info(
        { userId: keycloakUserId, patientId: patient.id },
        'Patient registered successfully',
      );

      return {
        userId: keycloakUserId,
        patientId: patient.id || '',
        username: registerDto.username,
        email: registerDto.email,
        message: 'Patient registered successfully',
      };
    } catch (error) {
      this.logger.error({ error, username: registerDto.username }, 'Failed to register patient');

      // If error is already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, throw a generic error
      throw new BadRequestException(
        `Failed to register patient: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Encrypt sensitive patient data
   * Encrypts identifiers (SSN), addresses, and telecom information
   * @param patientData Patient data to encrypt
   * @returns Patient data with encrypted sensitive fields
   */
  private async encryptSensitivePatientData(patientData: RegisterPatientDto): Promise<{
    identifier?: Array<{ system?: string; value?: string }>;
    telecom?: Array<{ system?: string; value?: string; use?: string }>;
    address?: Array<{
      use?: string;
      type?: string;
      line?: string[];
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    }>;
  }> {
    const encrypted: {
      identifier?: CreatePatientDto['identifier'];
      telecom?: CreatePatientDto['telecom'];
      address?: CreatePatientDto['address'];
    } = {};

    // Encrypt identifier values (SSN, medical record numbers, etc.)
    if (patientData.identifier && patientData.identifier.length > 0) {
      encrypted.identifier = await Promise.all(
        patientData.identifier.map(async (id) => {
          if (id.value) {
            // Only encrypt if it's a sensitive identifier (SSN, etc.)
            const sensitiveSystems = [
              'http://hl7.org/fhir/sid/us-ssn',
              'http://hl7.org/fhir/sid/us-medicare',
              'http://hl7.org/fhir/sid/us-drivers',
            ];
            if (sensitiveSystems.includes(id.system || '')) {
              try {
                const encryptedValue = await this.encryptionService.encrypt(id.value);
                return { ...id, value: encryptedValue };
              } catch (error) {
                this.logger.warn(
                  { error, identifier: id.value },
                  'Failed to encrypt identifier, storing as plaintext',
                );
                return id; // Store as plaintext if encryption fails
              }
            }
          }
          return id;
        }),
      );
    } else {
      encrypted.identifier = patientData.identifier;
    }

    // Encrypt address information (street addresses, postal codes)
    if (patientData.address && patientData.address.length > 0) {
      encrypted.address = await Promise.all(
        patientData.address.map(async (addr) => {
          const encryptedAddr = { ...addr };
          if (addr.line && addr.line.length > 0) {
            try {
              encryptedAddr.line = await Promise.all(
                addr.line.map(async (line) => {
                  try {
                    return await this.encryptionService.encrypt(line);
                  } catch (error) {
                    this.logger.warn(
                      { error, line },
                      'Failed to encrypt address line, storing as plaintext',
                    );
                    return line;
                  }
                }),
              );
            } catch (error) {
              this.logger.warn({ error }, 'Failed to encrypt address lines');
            }
          }
          if (addr.postalCode) {
            try {
              encryptedAddr.postalCode = await this.encryptionService.encrypt(addr.postalCode);
            } catch (error) {
              this.logger.warn(
                { error, postalCode: addr.postalCode },
                'Failed to encrypt postal code, storing as plaintext',
              );
              // Keep original if encryption fails
            }
          }
          return encryptedAddr;
        }),
      );
    } else {
      encrypted.address = patientData.address;
    }

    // Encrypt telecom information (phone numbers, but not emails - emails are needed for login)
    if (patientData.telecom && patientData.telecom.length > 0) {
      encrypted.telecom = await Promise.all(
        patientData.telecom.map(async (contact) => {
          // Only encrypt phone numbers, not emails
          if (contact.system === 'phone' && contact.value) {
            try {
              const encryptedValue = await this.encryptionService.encrypt(contact.value);
              return { ...contact, value: encryptedValue };
            } catch (error) {
              this.logger.warn(
                { error, telecom: contact.value },
                'Failed to encrypt telecom, storing as plaintext',
              );
              return contact;
            }
          }
          return contact; // Keep email and other non-phone contacts as plaintext
        }),
      );
    } else {
      encrypted.telecom = patientData.telecom;
    }

    return encrypted;
  }
}
