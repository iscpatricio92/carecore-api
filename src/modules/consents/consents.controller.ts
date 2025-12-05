import { Body, Controller, Get, Header, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ConsentsService } from './consents.service';
import { Consent } from '@/common/interfaces/fhir.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Consents')
@Controller('consents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  @Header('Content-Type', 'application/fhir+json')
  create(@Body() consent: Consent) {
    return this.consentsService.create(consent);
  }

  @Get()
  @ApiOperation({ summary: 'Get all consents' })
  @Header('Content-Type', 'application/fhir+json')
  findAll() {
    return this.consentsService.findAll();
  }

  @Get(':id')
  @Header('Content-Type', 'application/fhir+json')
  findOne(@Param('id') id: string) {
    return this.consentsService.findOne(id);
  }
}
