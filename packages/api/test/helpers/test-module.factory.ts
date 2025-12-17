import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';

import { AppModule } from '../../src/app.module';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { MockJwtStrategy } from './mock-jwt-strategy';

/**
 * Get monorepo root path (same logic as AppModule)
 * From packages/api/test/helpers/ -> packages/api/test/ -> packages/api/ -> packages/ -> root
 */
function getMonorepoRoot(): string {
  return path.resolve(__dirname, '../../..');
}

/**
 * Get absolute path to .env.test file
 */
function getEnvTestPath(): string {
  return path.join(getMonorepoRoot(), '.env.test');
}

/**
 * Create test ConfigModule configuration
 * This configuration:
 * - Loads .env.test from monorepo root
 * - Allows environment variables to override .env.test values
 * - Does NOT load .env.local (avoids using development credentials)
 */
export function createTestConfigModule() {
  const envTestPath = getEnvTestPath();

  return ConfigModule.forRoot({
    isGlobal: true,
    // Load .env.test from monorepo root
    // In CI/CD, environment variables from GitHub Actions workflow will override these values
    envFilePath: [envTestPath],
    // Override with environment variables if provided
    // Environment variables take precedence over .env.test file
    // This allows CI/CD to use test_user/test_password while local uses .env.test
    load: [
      () => {
        // E2E tests configuration
        // Priority: environment variables > .env.test file
        // In CI/CD: GitHub Actions sets DB_USER=test_user, DB_PASSWORD=test_password, etc.
        // In local: .env.test provides development database credentials
        //
        // IMPORTANT: The load function runs AFTER envFilePath, so process.env already
        // contains values from .env.test. We return all values from process.env so
        // ConfigService can access them. Environment variables explicitly set will
        // override .env.test values.
        return {
          NODE_ENV: 'test',
          PORT: 3001,
          // Database credentials - from .env.test or environment variables
          DB_HOST: process.env.DB_HOST,
          DB_PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
          DB_USER: process.env.DB_USER,
          DB_PASSWORD: process.env.DB_PASSWORD,
          DB_NAME: process.env.DB_NAME,
          DB_SYNCHRONIZE: process.env.DB_SYNCHRONIZE === 'true',
          // Keycloak configuration
          KEYCLOAK_URL: process.env.KEYCLOAK_URL,
          KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
          KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
          KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
          // Encryption key
          ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
          // FHIR base URL (optional)
          FHIR_BASE_URL: process.env.FHIR_BASE_URL,
        };
      },
    ],
  });
}

/**
 * Create a test module with mocked JWT strategy
 * This allows E2E tests to use simple JWT tokens without Keycloak
 *
 * SECURITY NOTE: This factory uses test-only credentials and secrets.
 * All values here (passwords, secrets, keys) are for TESTING ONLY and should
 * NEVER be used in production environments.
 */
export async function createTestModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(ConfigModule)
    .useModule(createTestConfigModule())
    .overrideProvider(JwtStrategy)
    .useClass(MockJwtStrategy)
    .compile();
}

/**
 * Create a test application with mocked JWT strategy
 * IMPORTANT: Always call app.close() in afterAll() to prevent hanging processes
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await createTestModule();
  const app = moduleFixture.createNestApplication();

  // Apply global prefix
  app.setGlobalPrefix('api');

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}
