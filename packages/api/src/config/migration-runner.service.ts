import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppDataSource } from './data-source';

/**
 * Migration Runner Service
 *
 * Automatically runs pending migrations on application startup.
 * This is optional and controlled by the RUN_MIGRATIONS_ON_STARTUP environment variable.
 *
 * Best Practices:
 * - In development: Can be enabled for convenience
 * - In production: Should be disabled and migrations should be run manually or via CI/CD
 * - Always test migrations in staging before production
 *
 * @see https://typeorm.io/migrations#running-migrations-programmatically
 */
@Injectable()
export class MigrationRunnerService implements OnModuleInit {
  private readonly logger = new Logger(MigrationRunnerService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const shouldRunMigrations = this.configService.get<boolean>('RUN_MIGRATIONS_ON_STARTUP', false);

    if (!shouldRunMigrations) {
      this.logger.log(
        'Auto-running migrations is disabled. Set RUN_MIGRATIONS_ON_STARTUP=true to enable.',
      );
      return;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';

    if (isProduction) {
      this.logger.warn('⚠️  WARNING: Auto-running migrations in production is enabled!');
      this.logger.warn(
        '⚠️  This is not recommended. Consider running migrations manually or via CI/CD.',
      );
    }

    try {
      this.logger.log('🔄 Checking for pending migrations...');

      // Initialize DataSource if not already initialized
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        this.logger.log('✅ DataSource initialized');
      }

      // Run pending migrations
      const migrations = await AppDataSource.runMigrations();

      if (migrations.length === 0) {
        this.logger.log('✅ No pending migrations found. Database is up to date.');
      } else {
        this.logger.log(`✅ Successfully ran ${migrations.length} migration(s):`);
        migrations.forEach((migration) => {
          this.logger.log(`   - ${migration.name}`);
        });
      }
    } catch (error) {
      this.logger.error('❌ Failed to run migrations:', error);
      this.logger.error('Application will continue, but database may be out of sync.');
      // Don't throw - allow application to start even if migrations fail
      // This is important for production where you might want to fix issues manually
    }
  }
}
