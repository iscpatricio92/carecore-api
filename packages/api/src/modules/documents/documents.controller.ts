import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';

import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateDocumentReferenceDto,
  UpdateDocumentReferenceDto,
} from '../../common/dto/fhir-document-reference.dto';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
/**
 * @deprecated Use /api/fhir/DocumentReference instead. This endpoint is maintained for backward compatibility and tests.
 * The FHIR standard endpoint (/api/fhir/DocumentReference) should be used for all new integrations.
 */
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Header('Content-Type', 'application/fhir+json')
  @ApiOperation({ summary: 'Create a new DocumentReference' })
  @ApiResponse({ status: 201, description: 'DocumentReference created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  create(@Body() document: CreateDocumentReferenceDto) {
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
  @ApiParam({ name: 'id', description: 'DocumentReference ID' })
  @ApiResponse({ status: 200, description: 'DocumentReference found' })
  @ApiResponse({ status: 404, description: 'DocumentReference not found' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Put(':id')
  @Header('Content-Type', 'application/fhir+json')
  @ApiParam({ name: 'id', description: 'DocumentReference ID' })
  @ApiOperation({ summary: 'Update a DocumentReference' })
  @ApiResponse({ status: 200, description: 'DocumentReference updated successfully' })
  @ApiResponse({ status: 404, description: 'DocumentReference not found' })
  update(@Param('id') id: string, @Body() document: UpdateDocumentReferenceDto) {
    return this.documentsService.update(id, document);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'DocumentReference ID' })
  @ApiOperation({ summary: 'Delete a DocumentReference' })
  @ApiResponse({ status: 204, description: 'DocumentReference deleted' })
  @ApiResponse({ status: 404, description: 'DocumentReference not found' })
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
