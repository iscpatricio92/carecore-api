import { Controller, Get, Post, Query, Res, HttpCode, HttpStatus, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';

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
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint - Redirects to Keycloak for authentication
   * This endpoint initiates the OAuth2 Authorization Code flow.
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Redirige al usuario a Keycloak para autenticación OAuth2/OIDC',
  })
  @ApiResponse({
    status: 200,
    description: 'Redirección a Keycloak (en implementación)',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al generar URL de autorización',
  })
  async login(@Res() res: Response): Promise<void> {
    // TODO: Implement in Tarea 8
    const authUrl = this.authService.getAuthorizationUrl();
    if (authUrl) {
      res.redirect(authUrl);
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Authentication service not configured',
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
    summary: 'Callback de OAuth2',
    description: 'Endpoint que recibe el código de autorización de Keycloak',
  })
  @ApiQuery({
    name: 'code',
    description: 'Código de autorización de Keycloak',
    required: true,
  })
  @ApiQuery({
    name: 'state',
    description: 'Token CSRF para validar la solicitud',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticación exitosa, tokens retornados',
  })
  @ApiResponse({
    status: 400,
    description: 'Código de autorización inválido o faltante',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al intercambiar código por tokens',
  })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    // TODO: Implement in Tarea 9
    if (!code) {
      res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Authorization code is required',
      });
      return;
    }

    try {
      await this.authService.handleCallback(code, state);
      // In a real implementation, we would set cookies or return tokens
      res.status(HttpStatus.OK).json({
        message: 'Authentication successful',
        // Tokens would be returned here
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to process authentication callback',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Refresh token endpoint - Refreshes an access token using a refresh token
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refrescar token',
    description: 'Obtiene un nuevo access token usando un refresh token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token para obtener nuevo access token',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Nuevo access token generado exitosamente',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
  })
  async refresh(@Body('refreshToken') refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // TODO: Implement in Tarea 10
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }
    return await this.authService.refreshToken(refreshToken);
  }

  /**
   * Logout endpoint - Logs out the user and revokes tokens
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Cierra la sesión del usuario y revoca los tokens',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Refresh token a revocar',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado',
  })
  async logout(@Body('refreshToken') refreshToken: string): Promise<{
    message: string;
  }> {
    // TODO: Implement in Tarea 11
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }
    await this.authService.logout(refreshToken);
    return { message: 'Logged out successfully' };
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
