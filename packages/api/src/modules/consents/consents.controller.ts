import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';

import { ConsentsService } from './consents.service';
import {
  CreateConsentDto,
  UpdateConsentDto,
  ShareConsentWithPractitionerDto,
} from '../../common/dto/fhir-consent.dto';
import { Consent, User } from '@carecore/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ROLES } from '../../common/constants/roles';

@ApiTags('Consents')
@Controller('consents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
/**
 * @deprecated Use /api/fhir/Consent instead. This endpoint is maintained for backward compatibility and tests.
 * The FHIR standard endpoint (/api/fhir/Consent) should be used for all new integrations.
 */
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(ROLES.PATIENT, ROLES.ADMIN)
  @ApiOperation({ summary: 'Create a new Consent' })
  @ApiResponse({ status: 201, description: 'Consent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Patient or Admin role required. Patients can only create consents for themselves.',
  })
  create(@Body() createConsentDto: CreateConsentDto, @CurrentUser() user: User): Promise<Consent> {
    return this.consentsService.create(createConsentDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all consents (filtered by role)' })
  @ApiResponse({ status: 200, description: 'List of Consents' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  findAll(@CurrentUser() user?: User): Promise<{ total: number; entries: Consent[] }> {
    return this.consentsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Consent by ID' })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 200, description: 'Consent found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  findOne(@Param('id') id: string, @CurrentUser() user?: User): Promise<Consent> {
    return this.consentsService.findOne(id, user);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(ROLES.PATIENT, ROLES.ADMIN)
  @ApiOperation({ summary: 'Update a Consent' })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Patient or Admin role required. Patients can only update their own consents.',
  })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  update(
    @Param('id') id: string,
    @Body() updateConsentDto: UpdateConsentDto,
    @CurrentUser() user: User,
  ): Promise<Consent> {
    return this.consentsService.update(id, updateConsentDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(ROLES.PATIENT, ROLES.ADMIN)
  @ApiOperation({ summary: 'Delete a Consent' })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 204, description: 'Consent deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Patient or Admin role required. Patients can only delete their own consents.',
  })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    return this.consentsService.remove(id, user);
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(ROLES.PATIENT, ROLES.ADMIN)
  @ApiOperation({
    summary: 'Share consent with a practitioner',
    description:
      'Shares a consent with a practitioner for a specific number of days. Creates a provision that expires after the specified number of days.',
  })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 200, description: 'Consent shared successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Patient or Admin role required. Patients can only share their own consents.',
  })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  shareWithPractitioner(
    @Param('id') id: string,
    @Body() shareDto: ShareConsentWithPractitionerDto,
    @CurrentUser() user: User,
  ): Promise<Consent> {
    return this.consentsService.shareWithPractitioner(id, shareDto, user);
  }
}
