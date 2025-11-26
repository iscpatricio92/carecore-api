import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USER', 'carecore'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME', 'carecore_db'),
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
      synchronize:
        this.configService.get<string>('NODE_ENV') === 'development' &&
        this.configService.get<boolean>('DB_SYNCHRONIZE', false),
      logging: this.configService.get<string>('NODE_ENV') === 'development',
      ssl:
        this.configService.get<string>('NODE_ENV') === 'production'
          ? {
              rejectUnauthorized: false,
            }
          : false,
    };
  }
}
