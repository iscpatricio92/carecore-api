import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FhirController } from './fhir.controller';
import { FhirService } from './fhir.service';
import { SmartFhirService } from './services/smart-fhir.service';
import { PatientEntity } from '../../entities/patient.entity';
import { PractitionerEntity } from '../../entities/practitioner.entity';
import { EncounterEntity } from '../../entities/encounter.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ConsentsModule } from '../consents/consents.module';
import { DocumentsModule } from '../documents/documents.module';
import { EncountersModule } from '../encounters/encounters.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientEntity, PractitionerEntity, EncounterEntity]),
    AuthModule, // Import AuthModule to use exported guards (JwtAuthGuard, RolesGuard, MFARequiredGuard)
    AuditModule, // Import AuditModule to use AuditService for SMART on FHIR logging
    ConsentsModule, // Import ConsentsModule to use ConsentsService
    DocumentsModule, // Import DocumentsModule to use DocumentsService
    EncountersModule, // Import EncountersModule to use EncountersCoreService
    CommonModule, // Import CommonModule to use PatientContextService
  ],
  controllers: [FhirController],
  providers: [FhirService, SmartFhirService],
  exports: [FhirService],
})
export class FhirModule {}
