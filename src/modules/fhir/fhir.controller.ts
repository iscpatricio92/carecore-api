import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { FhirService } from './fhir.service';

@ApiTags('FHIR')
@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('metadata')
  @ApiOperation({ summary: 'FHIR CapabilityStatement (metadata)' })
  getMetadata() {
    return this.fhirService.getCapabilityStatement();
  }
}
