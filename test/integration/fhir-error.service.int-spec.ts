import { FhirErrorService } from '@/common/services/fhir-error.service';

describe('FhirErrorService (integration)', () => {
  it('createOperationOutcome should include diagnostics and location', () => {
    const outcome = FhirErrorService.createOperationOutcome(400, 'invalid-value', 'Invalid input', [
      'path.field',
    ]);

    expect(outcome.issue[0].severity).toBe('error');
    expect(outcome.issue[0].code).toBe('invalid');
    expect(outcome.issue[0].diagnostics).toBe('Invalid input');
    expect(outcome.issue[0].location).toContain('path.field');
  });

  it('createValidationError should map field errors', () => {
    const outcome = FhirErrorService.createValidationError([
      { field: 'patient.name', message: 'Name required' },
    ]);
    expect(outcome.issue[0].code).toBe('invalid');
    expect(outcome.issue[0].details?.text).toBe('Name required');
    expect(outcome.issue[0].location).toContain('patient.name');
  });

  it('createUnauthorizedError should produce security code', () => {
    const outcome = FhirErrorService.createUnauthorizedError();
    expect(outcome.issue[0].code).toBe('security');
    expect(outcome.issue[0].diagnostics).toContain('authentication');
  });

  it('createForbiddenError should produce forbidden code', () => {
    const outcome = FhirErrorService.createForbiddenError();
    expect(outcome.issue[0].code).toBe('forbidden');
  });

  it('createInternalError should produce exception code', () => {
    const outcome = FhirErrorService.createInternalError('boom');
    expect(outcome.issue[0].code).toBe('exception');
    expect(outcome.issue[0].details?.text).toBe('boom');
  });
});
