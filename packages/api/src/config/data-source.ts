import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables (same logic as NestJS)
// First load environment-specific file, then .env.local (overwrites)
const nodeEnv = process.env.NODE_ENV || 'development';
config({ path: `.env.${nodeEnv}` });
config({ path: '.env.local', override: true });

/**
 * Get database configuration from environment variables
 * This function is called lazily to allow tests to set environment variables first
 */
function getDataSourceOptions(): DataSourceOptions {
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const username = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const isProduction = nodeEnv === 'production';

  // Only validate in non-test environments or when explicitly required
  // In test environments, validation happens when DataSource is initialized
  const isTest = nodeEnv === 'test';
  if (!isTest && (!host || !port || !username || !password || !database)) {
    throw new Error(
      'Missing required database configuration. Please set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in your environment variables.',
    );
  }

  const baseConfig: DataSourceOptions = {
    type: 'postgres',
    host: host || 'localhost',
    port,
    username: username || 'test_user',
    password: password || 'test_password',
    database: database || 'test_db',
    entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../migrations/**/*{.ts,.js}')],
    synchronize: false, // Never use synchronize with migrations
    logging: nodeEnv === 'development',
  };

  // Add SSL configuration for production
  return isProduction
    ? {
        ...baseConfig,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        ...baseConfig,
        extra: {
          sslmode: 'disable',
        },
      };
}

// Export DataSource instance for TypeORM CLI
// Options are loaded lazily to allow tests to set environment variables first
export const AppDataSource = new DataSource(getDataSourceOptions());
