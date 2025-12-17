import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import * as path from 'path';

import { DatabaseConfig } from './config/database.config';
import { MigrationRunnerModule } from './config/migration-runner.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FhirModule } from './modules/fhir/fhir.module';
import { PatientsModule } from './modules/patients/patients.module';
import { PractitionersModule } from './modules/practitioners/practitioners.module';
import { EncountersModule } from './modules/encounters/encounters.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

// Helper to get monorepo root for env file paths
// When running from packages/api/dist, __dirname points to packages/api/dist
// So we go up 2 levels to reach monorepo root
function getEnvFilePaths(): string[] {
  const monorepoRoot = path.resolve(__dirname, '../..');
  const nodeEnv = process.env.NODE_ENV || 'development';
  return [path.join(monorepoRoot, `.env.${nodeEnv}`), path.join(monorepoRoot, '.env.local')];
}

@Module({
  imports: [
    // Configuration module
    // Load environment files: first specific environment, then .env.local (overwrites)
    // Paths are resolved relative to monorepo root
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePaths(),
    }),

    // Logger module (Pino)
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: false,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                  // Enable colorization even in Docker if TTY is available
                  colorizeObjects: true,
                },
              }
            : undefined,
        serializers: {
          req: (req) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const request = req as any;
            return {
              id: request.id || request.requestId,
              method: request.method,
              url: request.url,
              headers: {
                host: request.headers?.host,
                'user-agent': request.headers?.['user-agent'],
              },
            };
          },
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
        customProps: (req) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const request = req as any;
          return {
            requestId: request.requestId || request.id,
          };
        },
      },
    }),

    // Database module
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
    }),

    // Migration Runner Module (optional - controlled by RUN_MIGRATIONS_ON_STARTUP)
    MigrationRunnerModule,

    // Common module (shared services)
    CommonModule,

    // Feature modules
    AuditModule,
    AuthModule,
    FhirModule,
    PatientsModule,
    PractitionersModule,
    EncountersModule,
    ConsentsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
