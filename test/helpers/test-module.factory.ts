import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppModule } from '../../src/app.module';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { MockJwtStrategy } from './mock-jwt-strategy';

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
    .useModule(
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env.local'],
        // Override with test environment variables
        // NOTE: All values here are test-only and should NEVER be used in production
        load: [
          () => ({
            NODE_ENV: 'test',
            PORT: 3001,
            DB_HOST: process.env.DB_HOST || 'localhost',
            DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
            // Test-only database credentials - NEVER use in production
            DB_USER: process.env.DB_USER || 'test_user',
            DB_PASSWORD: process.env.DB_PASSWORD || 'test_password',
            DB_NAME: process.env.DB_NAME || 'test_db',
            // Test-only Keycloak configuration - NEVER use in production
            KEYCLOAK_URL: process.env.KEYCLOAK_URL || 'http://localhost:8080',
            KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || 'carecore',
            KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || 'carecore-api',
            KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET || 'test-secret',
            // Test-only encryption key - NEVER use in production
            ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'test-encryption-key-32-chars-long',
          }),
        ],
      }),
    )
    .overrideProvider(JwtStrategy)
    .useClass(MockJwtStrategy)
    .compile();
}

/**
 * Create a test application with mocked JWT strategy
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
