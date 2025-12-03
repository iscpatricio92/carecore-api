import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';

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

    const baseConfig = {
      type: 'postgres' as const,
      host,
      port,
      username,
      password,
      database,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
      synchronize:
        nodeEnv === 'development' && this.configService.get<boolean>('DB_SYNCHRONIZE', false),
      logging: nodeEnv === 'development',
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
