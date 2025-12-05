import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';

/**
 * Test App Factory
 * Creates a NestJS application instance for E2E testing
 *
 * SECURITY NOTE: This factory uses test-only credentials and secrets.
 * All values here are for TESTING ONLY and should NEVER be used in production.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(ConfigModule)
    .useModule(
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env.local'],
        // Override with test environment variables
        load: [
          () => ({
            NODE_ENV: 'test',
            PORT: 3001, // Use different port for tests
            DB_HOST: process.env.DB_HOST || 'localhost',
            DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
            DB_USER: process.env.DB_USER || 'test_user',
            DB_PASSWORD: process.env.DB_PASSWORD || 'test_password',
            DB_NAME: process.env.DB_NAME || 'test_db',
            KEYCLOAK_URL: process.env.KEYCLOAK_URL || 'http://localhost:8080',
            KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || 'carecore',
            KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || 'carecore-api',
            KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET || 'test-secret',
            ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'test-encryption-key-32-chars-long',
          }),
        ],
      }),
    )
    .compile();

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

/**
 * Helper to create a supertest request instance
 */
export function createRequest(app: INestApplication) {
  return request(app.getHttpServer());
}
