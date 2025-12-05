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
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : String(error), params },
        'Failed to create audit log',
      );
    }
  }
}
