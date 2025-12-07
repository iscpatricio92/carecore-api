import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Body,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './interfaces/user.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';
import {
  VerifyPractitionerDto,
  VerifyPractitionerResponseDto,
} from './dto/verify-practitioner.dto';
import {
  ReviewVerificationDto,
  ReviewVerificationResponseDto,
  ListVerificationsQueryDto,
  ListVerificationsResponseDto,
  VerificationDetailResponseDto,
} from './dto/review-verification.dto';
import {
  SetupMFAResponseDto,
  VerifyMFADto,
  VerifyMFAResponseDto,
  DisableMFADto,
  DisableMFAResponseDto,
} from './dto/mfa.dto';

/**
 * Authentication Controller
 *
 * Handles authentication endpoints for OAuth2/OIDC flow with Keycloak.
 * Provides endpoints for login, callback, token refresh, logout, and user information.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthController.name);
  }

  /**
   * Login endpoint - Redirects to Keycloak for authentication
   * This endpoint initiates the OAuth2 Authorization Code flow.
   *
   * By default, it redirects (302) to Keycloak. If `returnUrl=true` query parameter is provided,
   * it returns the authorization URL in JSON format instead (useful for Swagger/testing).
   */
  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'Login (redirects to Keycloak)',
    description:
      'Initiates the OAuth2 Authorization Code flow by redirecting the user to Keycloak for authentication. ' +
      'Add `?returnUrl=true` as a query parameter to get the authorization URL in JSON format instead of redirecting (useful for Swagger).',
  })
  @ApiQuery({
    name: 'returnUrl',
    required: false,
    type: Boolean,
    description:
      'If true, returns the authorization URL in JSON format instead of redirecting (useful for Swagger)',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Keycloak for authentication (default behavior)',
  })
  @ApiResponse({
    status: 200,
    description: 'Authorization URL returned in JSON format (when returnUrl=true)',
    schema: {
      type: 'object',
      properties: {
        authorizationUrl: {
          type: 'string',
          description: 'Keycloak URL to initiate login',
        },
        state: {
          type: 'string',
          description: 'CSRF token for validation',
        },
        message: {
          type: 'string',
          description: 'Informative message',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Authentication configuration error',
  })
  @ApiResponse({
    status: 500,
    description: 'Error generating authorization URL',
  })
  async login(
    @Req() req: Request,
    @Res() res: Response,
    @Query('returnUrl') returnUrl?: string,
  ): Promise<void> {
    try {
      // Generate CSRF state token
      const stateToken = this.authService.generateStateToken();

      // Build redirect URI (callback URL)
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const redirectUri = `${protocol}://${host}/api/auth/callback`;

      // Get authorization URL from Keycloak
      const authUrl = this.authService.getAuthorizationUrl(stateToken, redirectUri);

      // Store state token in HTTP-only cookie for validation in callback
      // Cookie expires in 10 minutes (same as typical OAuth2 state token lifetime)
      res.cookie('oauth_state', stateToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'lax', // CSRF protection
        maxAge: 10 * 60 * 1000, // 10 minutes
        path: '/api/auth',
      });

      // If returnUrl=true, return JSON instead of redirecting (useful for Swagger/testing)
      if (returnUrl === 'true') {
        res.status(HttpStatus.OK).json({
          authorizationUrl: authUrl,
          state: stateToken,
          message:
            'Visit this URL in your browser to log in. For production use, omit the returnUrl parameter for automatic redirect.',
        });
        return;
      }

      // Default behavior: redirect to Keycloak
      res.redirect(authUrl);
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate authorization URL');
      res
        .status(
          error instanceof BadRequestException
            ? HttpStatus.BAD_REQUEST
            : HttpStatus.INTERNAL_SERVER_ERROR,
        )
        .json({
          message: error instanceof Error ? error.message : 'Failed to generate authorization URL',
        });
    }
  }

  /**
   * OAuth2 callback endpoint - Handles callback from Keycloak
   * This endpoint receives the authorization code and exchanges it for tokens.
   */
  @Get('callback')
  @Public()
  @ApiOperation({
    summary: 'Keycloak OAuth2 Callback',
    description:
      'Endpoint that receives the authorization code from Keycloak and exchanges it for tokens.',
  })
  @ApiQuery({
    name: 'code',
    required: true,
    type: String,
    description: 'Authorization code from Keycloak',
  })
  @ApiQuery({
    name: 'state',
    required: true,
    type: String,
    description: 'CSRF token for state protection',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to frontend with tokens in cookies',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid code or state',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid state token or authorization code',
  })
  @ApiResponse({
    status: 500,
    description: 'Error processing callback',
  })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!code || !state) {
      res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Authorization code and state are required',
      });
      return;
    }

    try {
      // Get stored state token from cookie
      const storedState = req.cookies?.oauth_state;

      // Build redirect URI (must match the one used in login)
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const redirectUri = `${protocol}://${host}/api/auth/callback`;

      // Handle callback: validate state, exchange code for tokens, get user info
      const result = await this.authService.handleCallback(code, state, storedState, redirectUri);

      // Get frontend URL from environment or use default
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        this.configService.get<string>('CLIENT_URL') ||
        'http://localhost:3001';

      // Set secure HTTP-only cookies for tokens
      const isProduction = process.env.NODE_ENV === 'production';

      // Access token cookie (expires based on token expiration)
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: isProduction, // Only send over HTTPS in production
        sameSite: 'lax',
        maxAge: result.expiresIn * 1000, // Convert seconds to milliseconds
        path: '/',
      });

      // Refresh token cookie (longer expiration, typically 30 days)
      if (result.refreshToken) {
        res.cookie('refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/',
        });
      }

      // Clear the oauth_state cookie (no longer needed)
      res.clearCookie('oauth_state', {
        path: '/api/auth',
      });

      this.logger.debug(
        { userId: result.user.id, username: result.user.username },
        'Authentication successful, redirecting to frontend',
      );

      // Redirect to frontend (tokens are in cookies)
      res.redirect(`${frontendUrl}?auth=success`);
    } catch (error) {
      this.logger.error(
        { error, code: !!code, state: !!state },
        'Failed to process authentication callback',
      );

      // Get frontend URL for error redirect
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        this.configService.get<string>('CLIENT_URL') ||
        'http://localhost:3001';

      // Redirect to frontend with error
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      res.redirect(`${frontendUrl}?auth=error&message=${encodeURIComponent(errorMessage)}`);
    }
  }

  /**
   * Refresh token endpoint - Refreshes an access token using a refresh token
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Obtains a new access token and refresh token using a valid refresh token. The refresh token can be sent in the request body or in a cookie.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token to obtain a new access token (optional if sent in cookie)',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'New access token generated successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'New access token' },
        refreshToken: {
          type: 'string',
          description: 'New refresh token (if provided by Keycloak)',
        },
        expiresIn: {
          type: 'number',
          description: 'Access token expiration time in seconds',
        },
        tokenType: { type: 'string', description: 'Token type (Bearer)' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing or invalid refresh token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Body('refreshToken') refreshTokenFromBody: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Try to get refresh token from body first, then from cookie
    const refreshToken = refreshTokenFromBody || req.cookies?.refresh_token;

    if (!refreshToken) {
      res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Refresh token is required. Provide it in the request body or as a cookie.',
      });
      return;
    }

    try {
      const tokens = await this.authService.refreshToken(refreshToken);

      // Set secure HTTP-only cookies for new tokens
      const isProduction = process.env.NODE_ENV === 'production';

      // Access token cookie
      res.cookie('access_token', tokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: tokens.expiresIn * 1000,
        path: '/',
      });

      // Refresh token cookie (update if new one is provided)
      if (tokens.refreshToken && tokens.refreshToken !== refreshToken) {
        res.cookie('refresh_token', tokens.refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/',
        });
      }

      // Return tokens in response body as well (for clients that don't use cookies)
      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to refresh token');

      const statusCode =
        error instanceof UnauthorizedException || error instanceof BadRequestException
          ? error instanceof UnauthorizedException
            ? HttpStatus.UNAUTHORIZED
            : HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR;

      res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Failed to refresh token',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Logout endpoint - Logs out the user and revokes tokens
   * This endpoint revokes tokens in Keycloak and clears local session cookies.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout',
    description:
      'Logs out the user, revokes tokens in Keycloak, and clears local cookies. The refresh token can be sent in the request body or in a cookie.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token to revoke (optional if sent in cookie)',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Session closed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Confirmation message' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing or invalid refresh token',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logout(
    @Body('refreshToken') refreshTokenFromBody: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Try to get refresh token from body first, then from cookie
    const refreshToken = refreshTokenFromBody || req.cookies?.refresh_token;

    if (!refreshToken) {
      res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Refresh token is required. Provide it in the request body or as a cookie.',
      });
      return;
    }

    try {
      // Revoke tokens in Keycloak
      await this.authService.logout(refreshToken);

      // Clear local cookies
      const isProduction = process.env.NODE_ENV === 'production';

      res.clearCookie('access_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      });

      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      });

      this.logger.debug('User logged out successfully');

      res.json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to logout');

      const statusCode =
        error instanceof BadRequestException
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR;

      res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Failed to logout',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get current user endpoint - Returns information about the authenticated user
   */
  @Get('user')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user information',
    description: 'Returns the authenticated user information from the JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'User information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string' },
        roles: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getUser(@CurrentUser() user: User): Promise<User> {
    // TODO: Implement in Tarea 12
    // The user is already extracted by @CurrentUser() decorator
    return user;
  }

  /**
   * Request practitioner verification
   * Allows practitioners to submit verification documents (cedula/licencia)
   */
  @Post('verify-practitioner')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.PRACTITIONER, ROLES.ADMIN)
  @UseInterceptors(FileInterceptor('documentFile'))
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Request practitioner verification',
    description:
      'Submit verification documents (cedula or licencia) to request practitioner identity verification. Only practitioners and admins can submit verification requests.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['practitionerId', 'documentType', 'documentFile'],
      properties: {
        practitionerId: {
          type: 'string',
          description: 'FHIR Practitioner ID to verify',
          example: 'practitioner-123',
        },
        documentType: {
          type: 'string',
          enum: ['cedula', 'licencia'],
          description: 'Type of document being submitted',
          example: 'cedula',
        },
        documentFile: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, JPG, PNG) - Max 10MB',
        },
        additionalInfo: {
          type: 'string',
          description: 'Additional information or notes (optional)',
          example: 'License expires in 6 months',
          maxLength: 1000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Verification request submitted successfully',
    type: VerifyPractitionerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or file validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Practitioner or Admin role required',
  })
  async verifyPractitioner(
    @Body() dto: VerifyPractitionerDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<VerifyPractitionerResponseDto> {
    try {
      const result = await this.authService.requestVerification(dto, file, user.id);
      return result;
    } catch (error) {
      this.logger.error({ error, userId: user.id }, 'Failed to submit verification request');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to submit verification request');
    }
  }

  /**
   * List all practitioner verifications (admin only)
   */
  @Get('verify-practitioner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List all practitioner verifications',
    description:
      'Retrieve a paginated list of all practitioner verification requests. Only admins can access this endpoint.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    description: 'Filter by verification status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of verifications retrieved successfully',
    type: ListVerificationsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async listVerifications(
    @Query() query: ListVerificationsQueryDto,
  ): Promise<ListVerificationsResponseDto> {
    return this.authService.listVerifications(query);
  }

  /**
   * Get verification details by ID (admin only)
   */
  @Get('verify-practitioner/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get verification details',
    description:
      'Retrieve detailed information about a specific practitioner verification request. Only admins can access this endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Verification ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification details retrieved successfully',
    type: VerificationDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Verification not found',
  })
  async getVerification(@Param('id') id: string): Promise<VerificationDetailResponseDto> {
    return this.authService.getVerificationById(id);
  }

  /**
   * Review a practitioner verification (approve or reject) - Admin only
   */
  @Put('verify-practitioner/:id/review')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Review a practitioner verification',
    description:
      'Approve or reject a practitioner verification request. Only admins can review verifications. Rejection requires a reason.',
  })
  @ApiParam({
    name: 'id',
    description: 'Verification ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: ReviewVerificationDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Verification reviewed successfully',
    type: ReviewVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or verification is not in pending status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Verification not found',
  })
  async reviewVerification(
    @Param('id') id: string,
    @Body() dto: ReviewVerificationDto,
    @CurrentUser() user: User,
  ): Promise<ReviewVerificationResponseDto> {
    try {
      return await this.authService.reviewVerification(id, dto, user.id);
    } catch (error) {
      this.logger.error(
        { error, verificationId: id, reviewerId: user.id },
        'Failed to review verification',
      );
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to review verification');
    }
  }

  /**
   * Setup MFA endpoint - Generates TOTP secret and QR code for user
   */
  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Setup MFA for user',
    description:
      'Generates a TOTP secret and QR code for the authenticated user to configure MFA. The user must scan the QR code with an authenticator app (e.g., Google Authenticator, Authy).',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA setup data generated successfully',
    type: SetupMFAResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'MFA is already configured for this user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async setupMFA(@CurrentUser() user: User): Promise<SetupMFAResponseDto> {
    try {
      // Get user email from token or user object
      const userEmail = user.email || user.username || 'user@example.com';

      return await this.authService.setupMFA(user.keycloakUserId, userEmail);
    } catch (error) {
      this.logger.error({ error, userId: user.id }, 'Failed to setup MFA');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to setup MFA');
    }
  }

  /**
   * Verify MFA endpoint - Verifies TOTP code and enables MFA permanently
   */
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verify MFA setup',
    description:
      'Verifies the TOTP code from the authenticator app and enables MFA permanently for the user. The code must be generated from the secret provided during setup.',
  })
  @ApiBody({
    type: VerifyMFADto,
  })
  @ApiResponse({
    status: 200,
    description: 'MFA verified and enabled successfully',
    type: VerifyMFAResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid TOTP code or MFA already enabled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async verifyMFA(
    @Body() dto: VerifyMFADto,
    @CurrentUser() user: User,
  ): Promise<VerifyMFAResponseDto> {
    try {
      return await this.authService.verifyMFASetup(user.keycloakUserId, dto.code);
    } catch (error) {
      this.logger.error({ error, userId: user.id }, 'Failed to verify MFA');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to verify MFA');
    }
  }

  /**
   * Disable MFA endpoint - Disables MFA for user (requires valid TOTP code)
   */
  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Disable MFA for user',
    description:
      'Disables MFA for the authenticated user. Requires a valid TOTP code from the authenticator app for security verification.',
  })
  @ApiBody({
    type: DisableMFADto,
  })
  @ApiResponse({
    status: 200,
    description: 'MFA disabled successfully',
    type: DisableMFAResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid TOTP code or MFA not enabled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async disableMFA(
    @Body() dto: DisableMFADto,
    @CurrentUser() user: User,
  ): Promise<DisableMFAResponseDto> {
    try {
      return await this.authService.disableMFA(user.keycloakUserId, dto.code);
    } catch (error) {
      this.logger.error({ error, userId: user.id }, 'Failed to disable MFA');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to disable MFA');
    }
  }
}
