import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionService } from './services/encryption.service';

/**
 * Common Module
 *
 * Provides shared services and utilities used across the application.
 * This module exports services that can be imported by feature modules.
 */
@Module({
  imports: [TypeOrmModule],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class CommonModule {}
