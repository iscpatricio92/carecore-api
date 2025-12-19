import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsCoreService } from './documents-core.service';
import { DocumentReferenceEntity } from '../../entities/document-reference.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentReferenceEntity, PatientEntity]),
    CommonModule, // For PatientContextService
    AuthModule, // For ScopePermissionService
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsCoreService],
  exports: [DocumentsService, DocumentsCoreService], // Export Core Service for FhirService
})
export class DocumentsModule {}
