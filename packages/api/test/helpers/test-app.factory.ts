import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { createTestConfigModule } from './test-module.factory';

/**
 * Test App Factory
 * Creates a NestJS application instance for E2E testing
 *
 * SECURITY NOTE: This factory uses test-only credentials and secrets.
 * All values here are for TESTING ONLY and should NEVER be used in production.
 *
 * IMPORTANT: Always call app.close() in afterAll() to prevent hanging processes
 */

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(ConfigModule)
    .useModule(createTestConfigModule())
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
