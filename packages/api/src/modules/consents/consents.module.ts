import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';
import { ConsentsCoreService } from './consents-core.service';
import { ConsentEntity } from '../../entities/consent.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../../common/common.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsentEntity, PatientEntity]),
    AuthModule, // Import AuthModule to use ScopePermissionService
    CommonModule, // Import CommonModule to use PatientContextService
    AuditModule, // Import AuditModule to use AuditService
  ],
  controllers: [ConsentsController],
  providers: [ConsentsService, ConsentsCoreService],
  exports: [ConsentsService, ConsentsCoreService], // Export Core Service for potential future use
})
export class ConsentsModule {}
