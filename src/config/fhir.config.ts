import { registerAs } from '@nestjs/config';

export default registerAs('fhir', () => ({
  version: process.env.FHIR_VERSION || 'R4',
  baseUrl: process.env.FHIR_BASE_URL || 'http://localhost:3000/api/fhir',
  supportedResources: [
    'Patient',
    'Practitioner',
    'Encounter',
    'DocumentReference',
    'Consent',
    'Observation',
    'Condition',
    'Medication',
    'Procedure',
  ],
}));
