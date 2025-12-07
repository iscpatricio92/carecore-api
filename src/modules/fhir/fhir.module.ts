import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FhirController } from './fhir.controller';
import { FhirService } from './fhir.service';
import { PatientEntity } from '../../entities/patient.entity';
import { PractitionerEntity } from '../../entities/practitioner.entity';
import { EncounterEntity } from '../../entities/encounter.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientEntity, PractitionerEntity, EncounterEntity]),
    AuthModule, // Import AuthModule to use exported guards (JwtAuthGuard, RolesGuard, MFARequiredGuard)
  ],
  controllers: [FhirController],
  providers: [FhirService],
  exports: [FhirService],
})
export class FhirModule {}
