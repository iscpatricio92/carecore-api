import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Auth Module
 *
 * Handles authentication and authorization using Keycloak and JWT tokens.
 * This module provides:
 * - JWT strategy for validating tokens from Keycloak
 * - Guards for protecting endpoints
 * - Decorators for accessing user information and roles
 * - Authentication endpoints (login, callback, refresh, logout)
 */
@Module({
  imports: [
    // ConfigModule is already global, but explicitly importing for clarity
    ConfigModule,
    // PassportModule for authentication strategies
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // JwtModule is registered but not used for token validation
    // Token validation is handled by passport-jwt with Keycloak's public keys
    JwtModule.register({}),
  ],
  controllers: [],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [PassportModule, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
