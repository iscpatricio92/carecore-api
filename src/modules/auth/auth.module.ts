import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

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
    // JwtModule will be configured in a future task
    // For now, just register it (configuration will be added in Tarea 3)
    JwtModule.register({}),
  ],
  controllers: [],
  providers: [],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
