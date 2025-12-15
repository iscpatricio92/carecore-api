import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MigrationRunnerService } from './migration-runner.service';

/**
 * Migration Runner Module
 *
 * Provides automatic migration execution on application startup.
 * This is optional and controlled by the RUN_MIGRATIONS_ON_STARTUP environment variable.
 *
 * To enable automatic migrations:
 *   Set RUN_MIGRATIONS_ON_STARTUP=true in your .env file
 *
 * ⚠️  WARNING: Not recommended for production!
 * In production, migrations should be run manually or via CI/CD pipelines.
 */
@Module({
  imports: [ConfigModule],
  providers: [MigrationRunnerService],
  exports: [MigrationRunnerService],
})
export class MigrationRunnerModule {}
