import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogEntity } from '../../entities/audit-log.entity';
import { AuditService } from './audit.service';

/**
 * Audit Module
 * Provides audit logging functionality for FHIR resource access and modifications
 *
 * @description
 * This module is marked as @Global() so it can be imported once in AppModule
 * and used throughout the application without re-importing.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
