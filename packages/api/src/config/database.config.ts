import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PatientEntity } from '../entities/patient.entity';
import { PractitionerEntity } from '../entities/practitioner.entity';
import { EncounterEntity } from '../entities/encounter.entity';
import { ConsentEntity } from '../entities/consent.entity';
import { DocumentReferenceEntity } from '../entities/document-reference.entity';
import { PractitionerVerificationEntity } from '../entities/practitioner-verification.entity';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    // Todas las variables deben venir del archivo de entorno, sin valores por defecto
    const host = this.configService.get<string>('DB_HOST');
    const port = this.configService.get<number>('DB_PORT');
    const username = this.configService.get<string>('DB_USER');
    const password = this.configService.get<string>('DB_PASSWORD');
    const database = this.configService.get<string>('DB_NAME');

    if (!host || !port || !username || !password || !database) {
      throw new Error(
        'Missing required database configuration. Please set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in your environment variables.',
      );
    }

    // Importar entidades directamente para compatibilidad con webpack
    // En desarrollo, webpack no puede resolver glob patterns en tiempo de ejecución
    const entities = [
      PatientEntity,
      PractitionerEntity,
      EncounterEntity,
      ConsentEntity,
      DocumentReferenceEntity,
      PractitionerVerificationEntity,
    ];

    const baseConfig = {
      type: 'postgres' as const,
      host,
      port,
      username,
      password,
      database,
      entities,
      migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
      // Enable synchronize in development or test mode when DB_SYNCHRONIZE is true
      // This is safe for tests and local development, but should NEVER be used in production
      synchronize:
        (nodeEnv === 'development' || nodeEnv === 'test') &&
        this.configService.get<boolean>('DB_SYNCHRONIZE', false),
      logging: nodeEnv === 'development' || nodeEnv === 'test',
      // Reduce retry attempts in test mode to fail faster
      retryAttempts: nodeEnv === 'test' ? 1 : 9,
      retryDelay: nodeEnv === 'test' ? 100 : 3000,
    };

    // En producción, usar SSL
    if (isProduction) {
      return {
        ...baseConfig,
        ssl: {
          rejectUnauthorized: false,
        },
      };
    }

    // En desarrollo, forzar deshabilitación de SSL usando extra
    // Esto es necesario porque el driver de PostgreSQL puede intentar usar SSL por defecto
    return {
      ...baseConfig,
      extra: {
        sslmode: 'disable',
      },
    };
  }
}
