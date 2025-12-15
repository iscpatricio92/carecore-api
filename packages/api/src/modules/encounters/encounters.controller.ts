import { Body, Controller, Get, Header, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { EncountersService } from './encounters.service';
import { Encounter } from '@carecore/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Encounters')
@Controller('encounters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Post()
  @Header('Content-Type', 'application/fhir+json')
  create(@Body() encounter: Encounter) {
    return this.encountersService.create(encounter);
  }

  @Get()
  @ApiOperation({ summary: 'Get all encounters' })
  @Header('Content-Type', 'application/fhir+json')
  findAll() {
    return this.encountersService.findAll();
  }

  @Get(':id')
  @Header('Content-Type', 'application/fhir+json')
  findOne(@Param('id') id: string) {
    return this.encountersService.findOne(id);
  }
}
