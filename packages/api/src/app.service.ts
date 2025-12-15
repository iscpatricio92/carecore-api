import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'CareCore API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  async getDatabaseHealth() {
    const health = {
      status: 'connected',
      connected: true,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.dataSource.query('SELECT 1');
      return health;
    } catch (error) {
      return {
        status: 'disconnected',
        connected: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
