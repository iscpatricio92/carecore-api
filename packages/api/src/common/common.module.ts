import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionService } from './services/encryption.service';
import { PatientContextService } from './services/patient-context.service';

/**
 * Common Module
 *
 * Provides shared services and utilities used across the application.
 * This module exports services that can be imported by feature modules.
 */
@Module({
  imports: [TypeOrmModule],
  providers: [EncryptionService, PatientContextService],
  exports: [EncryptionService, PatientContextService],
})
export class CommonModule {}
