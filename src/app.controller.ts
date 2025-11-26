import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'API health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('health/db')
  @ApiOperation({ summary: 'Database health check endpoint - verifies PostgreSQL connection' })
  @ApiResponse({ status: 200, description: 'Database is connected' })
  @ApiResponse({ status: 503, description: 'Database is disconnected' })
  async getDatabaseHealth() {
    return this.appService.getDatabaseHealth();
  }
}
