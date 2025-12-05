import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Body,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './interfaces/user.interface';

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
   */
  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'Iniciar sesión (redirige a Keycloak)',
    description:
      'Inicia el flujo OAuth2 Authorization Code redirigiendo al usuario a Keycloak para autenticación.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirección a Keycloak para autenticación',
  })
  @ApiResponse({
    status: 400,
    description: 'Error en la configuración de autenticación',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al generar URL de autorización',
  })
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
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

      // Redirect to Keycloak
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
    summary: 'Callback de Keycloak OAuth2',
    description:
      'Endpoint que recibe el código de autorización de Keycloak y lo intercambia por tokens.',
  })
  @ApiQuery({
    name: 'code',
    required: true,
    type: String,
    description: 'Código de autorización de Keycloak',
  })
  @ApiQuery({
    name: 'state',
    required: true,
    type: String,
    description: 'Token CSRF para protección de estado',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirección al frontend con tokens en cookies',
  })
  @ApiResponse({
    status: 400,
    description: 'Código o estado inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'State token inválido o código de autorización inválido',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al procesar el callback',
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
    summary: 'Refrescar access token',
    description:
      'Obtiene un nuevo access token y refresh token usando un refresh token válido. El refresh token puede enviarse en el body o en una cookie.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description:
            'Refresh token para obtener nuevo access token (opcional si se envía en cookie)',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Nuevo access token generado exitosamente',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'Nuevo access token' },
        refreshToken: {
          type: 'string',
          description: 'Nuevo refresh token (si Keycloak lo proporciona)',
        },
        expiresIn: {
          type: 'number',
          description: 'Tiempo de expiración del access token en segundos',
        },
        tokenType: { type: 'string', description: 'Tipo de token (Bearer)' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Refresh token faltante o inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Cierra la sesión del usuario, revoca los tokens en Keycloak y limpia las cookies locales. El refresh token puede enviarse en el body o en una cookie.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token a revocar (opcional si se envía en cookie)',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensaje de confirmación' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Refresh token faltante o inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener información del usuario actual',
    description: 'Retorna la información del usuario autenticado desde el token JWT',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del usuario',
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
    description: 'No autenticado',
  })
  async getUser(@CurrentUser() user: User): Promise<User> {
    // TODO: Implement in Tarea 12
    // The user is already extracted by @CurrentUser() decorator
    return user;
  }
}
