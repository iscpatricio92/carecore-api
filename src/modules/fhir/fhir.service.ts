import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FhirService {
  constructor(private configService: ConfigService) {}

  getCapabilityStatement() {
    const baseUrl =
      this.configService.get<string>('FHIR_BASE_URL') || 'http://localhost:3000/api/fhir';

    return {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: new Date().toISOString(),
      publisher: 'CareCore',
      kind: 'instance',
      software: {
        name: 'CareCore API',
        version: '1.0.0',
      },
      implementation: {
        url: baseUrl,
        description: 'CareCore FHIR R4 API',
      },
      fhirVersion: '4.0.1',
      format: ['application/fhir+json', 'application/json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Patient',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
              ],
            },
            {
              type: 'Practitioner',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
              ],
            },
            {
              type: 'Encounter',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
              ],
            },
          ],
        },
      ],
    };
  }
}
