import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';

import { AuditLogEntity } from '../../entities/audit-log.entity';
import { User } from '../auth/interfaces/user.interface';

/**
 * Audit Service
 * Provides methods to log all FHIR resource access and modifications
 *
 * @description
 * This service creates immutable audit logs for compliance and security.
 * All logs are permanent and cannot be modified or deleted.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuditService.name);
  }

  /**
   * Logs a resource access (read/search)
   */
  async logAccess(params: {
    action: 'read' | 'search';
    resourceType: string;
    resourceId?: string | null;
    user?: User | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestMethod?: string | null;
    requestPath?: string | null;
    statusCode?: number | null;
    errorMessage?: string | null;
    // SMART on FHIR fields
    clientId?: string | null;
    clientName?: string | null;
    launchContext?: Record<string, unknown> | null;
    scopes?: string[] | null;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        userId: params.user?.id || null,
        userRoles: params.user?.roles || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestMethod: params.requestMethod || null,
        requestPath: params.requestPath || null,
        statusCode: params.statusCode || null,
        changes: null, // No changes for read/search
        errorMessage: params.errorMessage || null,
        // SMART on FHIR fields
        clientId: params.clientId || null,
        clientName: params.clientName || null,
        launchContext: params.launchContext || null,
        scopes: params.scopes || params.user?.scopes || null,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // Log error but don't throw - audit logging should not break the application
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), params },
        'Failed to create audit log for access',
      );
    }
  }

  /**
   * Logs a resource creation
   */
  async logCreate(params: {
    resourceType: string;
    resourceId: string;
    user?: User | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestMethod?: string | null;
    requestPath?: string | null;
    statusCode?: number | null;
    changes?: Record<string, unknown> | null;
    errorMessage?: string | null;
    // SMART on FHIR fields
    clientId?: string | null;
    clientName?: string | null;
    launchContext?: Record<string, unknown> | null;
    scopes?: string[] | null;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: 'create',
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        userId: params.user?.id || null,
        userRoles: params.user?.roles || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestMethod: params.requestMethod || null,
        requestPath: params.requestPath || null,
        statusCode: params.statusCode || null,
        changes: params.changes || null,
        errorMessage: params.errorMessage || null,
        // SMART on FHIR fields
        clientId: params.clientId || null,
        clientName: params.clientName || null,
        launchContext: params.launchContext || null,
        scopes: params.scopes || params.user?.scopes || null,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), params },
        'Failed to create audit log for create',
      );
    }
  }

  /**
   * Logs a resource update
   */
  async logUpdate(params: {
    resourceType: string;
    resourceId: string;
    user?: User | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestMethod?: string | null;
    requestPath?: string | null;
    statusCode?: number | null;
    changes?: Record<string, unknown> | null;
    errorMessage?: string | null;
    // SMART on FHIR fields
    clientId?: string | null;
    clientName?: string | null;
    launchContext?: Record<string, unknown> | null;
    scopes?: string[] | null;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: 'update',
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        userId: params.user?.id || null,
        userRoles: params.user?.roles || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestMethod: params.requestMethod || null,
        requestPath: params.requestPath || null,
        statusCode: params.statusCode || null,
        changes: params.changes || null,
        errorMessage: params.errorMessage || null,
        // SMART on FHIR fields
        clientId: params.clientId || null,
        clientName: params.clientName || null,
        launchContext: params.launchContext || null,
        scopes: params.scopes || params.user?.scopes || null,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), params },
        'Failed to create audit log for update',
      );
    }
  }

  /**
   * Logs a resource deletion
   */
  async logDelete(params: {
    resourceType: string;
    resourceId: string;
    user?: User | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestMethod?: string | null;
    requestPath?: string | null;
    statusCode?: number | null;
    errorMessage?: string | null;
    // SMART on FHIR fields
    clientId?: string | null;
    clientName?: string | null;
    launchContext?: Record<string, unknown> | null;
    scopes?: string[] | null;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: 'delete',
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        userId: params.user?.id || null,
        userRoles: params.user?.roles || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestMethod: params.requestMethod || null,
        requestPath: params.requestPath || null,
        statusCode: params.statusCode || null,
        changes: null, // No changes for delete
        errorMessage: params.errorMessage || null,
        // SMART on FHIR fields
        clientId: params.clientId || null,
        clientName: params.clientName || null,
        launchContext: params.launchContext || null,
        scopes: params.scopes || params.user?.scopes || null,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), params },
        'Failed to create audit log for delete',
      );
    }
  }

  /**
   * Generic method to log any action
   */
  async logAction(params: {
    action: string;
    resourceType: string;
    resourceId?: string | null;
    user?: User | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestMethod?: string | null;
    requestPath?: string | null;
    statusCode?: number | null;
    changes?: Record<string, unknown> | null;
    errorMessage?: string | null;
    // SMART on FHIR fields
    clientId?: string | null;
    clientName?: string | null;
    launchContext?: Record<string, unknown> | null;
    scopes?: string[] | null;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        userId: params.user?.id || null,
        userRoles: params.user?.roles || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestMethod: params.requestMethod || null,
        requestPath: params.requestPath || null,
        statusCode: params.statusCode || null,
        changes: params.changes || null,
        errorMessage: params.errorMessage || null,
        // SMART on FHIR fields
        clientId: params.clientId || null,
        clientName: params.clientName || null,
        launchContext: params.launchContext || null,
        scopes: params.scopes || params.user?.scopes || null,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), params },
        'Failed to create audit log',
      );
    }
  }

  /**
   * Logs a SMART on FHIR authorization request
   */
  async logSmartAuth(params: {
    clientId: string;
    clientName?: string | null;
    redirectUri: string;
    scopes: string[];
    user?: User | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    statusCode?: number | null;
    errorMessage?: string | null;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: 'smart_auth',
        resourceType: 'SMART-on-FHIR',
        resourceId: null,
        userId: params.user?.id || null,
        userRoles: params.user?.roles || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestMethod: 'GET',
        requestPath: '/api/fhir/auth',
        statusCode: params.statusCode || null,
        changes: {
          redirectUri: params.redirectUri,
        },
        errorMessage: params.errorMessage || null,
        // SMART on FHIR fields
        clientId: params.clientId,
        clientName: params.clientName || null,
        launchContext: null,
        scopes: params.scopes,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), params },
        'Failed to create audit log for SMART auth',
      );
    }
  }

  /**
   * Logs a SMART on FHIR token exchange
   */
  async logSmartToken(params: {
    clientId: string | null;
    clientName?: string | null;
    grantType: string;
    user?: User | null;
    launchContext?: Record<string, unknown> | null;
    scopes?: string[] | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    statusCode?: number | null;
    errorMessage?: string | null;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: 'smart_token',
        resourceType: 'SMART-on-FHIR',
        resourceId: null,
        userId: params.user?.id || null,
        userRoles: params.user?.roles || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestMethod: 'POST',
        requestPath: '/api/fhir/token',
        statusCode: params.statusCode || null,
        changes: {
          grantType: params.grantType,
        },
        errorMessage: params.errorMessage || null,
        // SMART on FHIR fields
        clientId: params.clientId,
        clientName: params.clientName || null,
        launchContext: params.launchContext || null,
        scopes: params.scopes || params.user?.scopes || null,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), params },
        'Failed to create audit log for SMART token',
      );
    }
  }

  /**
   * Logs a SMART on FHIR launch sequence
   */
  async logSmartLaunch(params: {
    clientId: string;
    clientName?: string | null;
    launchToken: string;
    launchContext: Record<string, unknown>;
    scopes: string[];
    user?: User | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    statusCode?: number | null;
    errorMessage?: string | null;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: 'smart_launch',
        resourceType: 'SMART-on-FHIR',
        resourceId: null,
        userId: params.user?.id || null,
        userRoles: params.user?.roles || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestMethod: 'GET',
        requestPath: '/api/fhir/authorize',
        statusCode: params.statusCode || null,
        changes: {
          launchToken: params.launchToken,
        },
        errorMessage: params.errorMessage || null,
        // SMART on FHIR fields
        clientId: params.clientId,
        clientName: params.clientName || null,
        launchContext: params.launchContext,
        scopes: params.scopes,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), params },
        'Failed to create audit log for SMART launch',
      );
    }
  }
}
