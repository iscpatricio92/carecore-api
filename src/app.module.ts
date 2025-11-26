import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { DatabaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FhirModule } from './modules/fhir/fhir.module';
import { PatientsModule } from './modules/patients/patients.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    // Configuration module
    // Load environment files: first specific environment, then .env.local (overwrites)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env.local'],
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

    // Feature modules
    FhirModule,
    PatientsModule,
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
