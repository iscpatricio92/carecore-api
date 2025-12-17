/**
 * Test constants - These are mock values for testing purposes only.
 * They are NOT real URLs or configuration values and should NEVER be used in production.
 */
const TEST_FHIR_CONFIG = {
  VERSION: 'R4',
  BASE_URL_LOCAL: 'http://localhost:3000/api/fhir',
  BASE_URL_EXAMPLE: 'https://api.example.com/fhir', // Using example.com domain (RFC 2606)
} as const;

const TEST_FHIR_CONFIG_R5 = {
  VERSION: 'R5',
  BASE_URL: 'https://api.example.com/fhir', // Using example.com domain (RFC 2606)
} as const;

describe('FhirConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should export default config function', async () => {
    const fhirConfig = await import('./fhir.config');

    expect(fhirConfig.default).toBeDefined();
    expect(typeof fhirConfig.default).toBe('function');
  });

  it('should return FHIR configuration with provided values', async () => {
    // Using test constants - these are mock values for testing only
    process.env.FHIR_VERSION = TEST_FHIR_CONFIG.VERSION;
    process.env.FHIR_BASE_URL = TEST_FHIR_CONFIG.BASE_URL_LOCAL;

    jest.resetModules();
    const fhirConfig = await import('./fhir.config');
    const config = fhirConfig.default();

    expect(config).toBeDefined();
    expect(config.version).toBe(TEST_FHIR_CONFIG.VERSION);
    expect(config.baseUrl).toBe(TEST_FHIR_CONFIG.BASE_URL_LOCAL);
    expect(config.supportedResources).toBeDefined();
    expect(Array.isArray(config.supportedResources)).toBe(true);
  });

  it('should use environment variables when set', async () => {
    // Using test constants - these are mock values for testing only
    process.env.FHIR_VERSION = TEST_FHIR_CONFIG_R5.VERSION;
    process.env.FHIR_BASE_URL = TEST_FHIR_CONFIG_R5.BASE_URL;

    jest.resetModules();
    const fhirConfig = await import('./fhir.config');
    const config = fhirConfig.default();

    expect(config.version).toBe(TEST_FHIR_CONFIG_R5.VERSION);
    expect(config.baseUrl).toBe(TEST_FHIR_CONFIG_R5.BASE_URL);
  });

  it('should include all supported FHIR resources', async () => {
    // Using test constants - these are mock values for testing only
    process.env.FHIR_VERSION = TEST_FHIR_CONFIG.VERSION;
    process.env.FHIR_BASE_URL = TEST_FHIR_CONFIG.BASE_URL_LOCAL;

    jest.resetModules();
    const fhirConfig = await import('./fhir.config');
    const config = fhirConfig.default();

    const expectedResources = [
      'Patient',
      'Practitioner',
      'Encounter',
      'DocumentReference',
      'Consent',
      'Observation',
      'Condition',
      'Medication',
      'Procedure',
    ];

    expect(config.supportedResources).toEqual(expect.arrayContaining(expectedResources));
    expect(config.supportedResources.length).toBe(expectedResources.length);
  });

  it('should be registered as config namespace', async () => {
    // Using test constants - these are mock values for testing only
    process.env.FHIR_VERSION = TEST_FHIR_CONFIG.VERSION;
    process.env.FHIR_BASE_URL = TEST_FHIR_CONFIG.BASE_URL_LOCAL;

    jest.resetModules();
    const fhirConfig = await import('./fhir.config');

    // Verify it's a function that returns config (registerAs pattern)
    const config = fhirConfig.default();
    expect(config).toHaveProperty('version');
    expect(config).toHaveProperty('baseUrl');
    expect(config).toHaveProperty('supportedResources');
  });
});
