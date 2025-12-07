import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { MFARequiredGuard } from './guards/mfa-required.guard';
import { ScopesGuard } from './guards/scopes.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DocumentStorageService } from './services/document-storage.service';
import { KeycloakAdminService } from './services/keycloak-admin.service';
import { ScopePermissionService } from './services/scope-permission.service';
import { PractitionerVerificationEntity } from '../../entities/practitioner-verification.entity';

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
    // TypeORM for PractitionerVerification entity
    TypeOrmModule.forFeature([PractitionerVerificationEntity]),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    MFARequiredGuard,
    ScopesGuard,
    AuthService,
    DocumentStorageService,
    KeycloakAdminService,
    ScopePermissionService,
  ],
  exports: [
    PassportModule,
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
    MFARequiredGuard,
    ScopesGuard,
    AuthService,
    KeycloakAdminService, // Export KeycloakAdminService for MFARequiredGuard in other modules
    ScopePermissionService, // Export ScopePermissionService for FHIR services
  ],
})
export class AuthModule {}
