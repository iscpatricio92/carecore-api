import { registerAs } from '@nestjs/config';

export default registerAs('fhir', () => {
  const version = process.env.FHIR_VERSION;
  const baseUrl = process.env.FHIR_BASE_URL;

  if (!version) {
    throw new Error('FHIR_VERSION is required. Please set it in your environment variables.');
  }

  if (!baseUrl) {
    throw new Error('FHIR_BASE_URL is required. Please set it in your environment variables.');
  }

  return {
    version,
    baseUrl,
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
  };
});
