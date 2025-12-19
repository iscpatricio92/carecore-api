import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { EncountersCoreService } from './encounters-core.service';
import { EncounterEntity } from '../../entities/encounter.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EncounterEntity, PatientEntity]),
    CommonModule, // For PatientContextService
    AuthModule, // For ScopePermissionService
  ],
  controllers: [EncountersController],
  providers: [EncountersService, EncountersCoreService],
  exports: [EncountersService, EncountersCoreService], // Export Core Service for FhirService
})
export class EncountersModule {}
