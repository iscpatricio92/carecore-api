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

  it('should return default FHIR configuration', async () => {
    delete process.env.FHIR_VERSION;
    delete process.env.FHIR_BASE_URL;

    const fhirConfig = await import('./fhir.config');
    const config = fhirConfig.default();

    expect(config).toBeDefined();
    expect(config.version).toBe('R4');
    expect(config.baseUrl).toBe('http://localhost:3000/api/fhir');
    expect(config.supportedResources).toBeDefined();
    expect(Array.isArray(config.supportedResources)).toBe(true);
  });

  it('should use environment variables when set', async () => {
    process.env.FHIR_VERSION = 'R5';
    process.env.FHIR_BASE_URL = 'https://api.example.com/fhir';

    jest.resetModules();
    const fhirConfig = await import('./fhir.config');
    const config = fhirConfig.default();

    expect(config.version).toBe('R5');
    expect(config.baseUrl).toBe('https://api.example.com/fhir');
  });

  it('should include all supported FHIR resources', async () => {
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
    const fhirConfig = await import('./fhir.config');

    // Verify it's a function that returns config (registerAs pattern)
    const config = fhirConfig.default();
    expect(config).toHaveProperty('version');
    expect(config).toHaveProperty('baseUrl');
    expect(config).toHaveProperty('supportedResources');
  });
});
