import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { DocumentsService } from './documents.service';
import { DocumentReference } from '@/common/interfaces/fhir.interface';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Header('Content-Type', 'application/fhir+json')
  create(@Body() document: DocumentReference) {
    return this.documentsService.create(document);
  }

  @Get()
  @ApiOperation({ summary: 'Get all document references' })
  @Header('Content-Type', 'application/fhir+json')
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  @Header('Content-Type', 'application/fhir+json')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }
}
