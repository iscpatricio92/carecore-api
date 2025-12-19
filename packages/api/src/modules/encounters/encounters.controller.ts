import { Controller, Get, Param, UseGuards, Query, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { EncountersService } from './encounters.service';
import { EncounterDetailDto } from '../../common/dto/encounter.dto';
import type { EncountersListResponse, User } from '@carecore/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Encounters')
@Controller('encounters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all encounters (optimized for mobile/web)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiResponse({ status: 200, description: 'List of Encounters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Patients can only access their own encounters',
  })
  async findAll(
    @Query('page') _page?: string,
    @Query('limit') _limit?: string,
    @CurrentUser() user?: User,
  ): Promise<EncountersListResponse> {
    // Service automatically filters by patient context if user is a patient
    return this.encountersService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an Encounter by ID (optimized for mobile/web)' })
  @ApiParam({ name: 'id', description: 'Encounter ID (database UUID or encounterId)' })
  @ApiResponse({ status: 200, description: 'Encounter found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Patients can only access their own encounters',
  })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user?: User): Promise<EncounterDetailDto> {
    // Try to find by database UUID first, then by encounterId
    // Service validates that user has access (patients can only access their own)
    try {
      return await this.encountersService.findOne(id, user);
    } catch (error) {
      // If NotFoundException, try by encounterId
      // If ForbiddenException, re-throw it
      if (error instanceof NotFoundException) {
        return this.encountersService.findByEncounterId(id, user);
      }
      throw error;
    }
  }
}
