import { FhirErrorService } from './fhir-error.service';

describe('FhirErrorService', () => {
  describe('createOperationOutcome', () => {
    it('should create an OperationOutcome with string message', () => {
      const result = FhirErrorService.createOperationOutcome(400, 'Test error');

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('OperationOutcome');
      expect(result.issue).toBeDefined();
      expect(result.issue.length).toBe(1);
      expect(result.issue[0]?.details?.text).toBe('Test error');
      expect(result.issue[0]?.severity).toBe('error');
      expect(result.issue[0]?.code).toBe('invalid');
    });

    it('should create an OperationOutcome with array of messages', () => {
      const messages = ['Error 1', 'Error 2'];
      const result = FhirErrorService.createOperationOutcome(400, messages);

      expect(result.issue.length).toBe(2);
      expect(result.issue[0]?.details?.text).toBe('Error 1');
      expect(result.issue[1]?.details?.text).toBe('Error 2');
    });

    it('should include diagnostics when provided', () => {
      const result = FhirErrorService.createOperationOutcome(
        400,
        'Test error',
        'Diagnostic information',
      );

      expect(result.issue[0]?.diagnostics).toBe('Diagnostic information');
    });

    it('should include location when provided', () => {
      const location = ['Patient.name', 'Patient.birthDate'];
      const result = FhirErrorService.createOperationOutcome(
        400,
        'Test error',
        undefined,
        location,
      );

      expect(result.issue[0]?.location).toEqual(location);
    });

    it('should map status codes to correct severity', () => {
      const testCases = [
        { status: 200, expectedSeverity: 'information' },
        { status: 300, expectedSeverity: 'warning' },
        { status: 400, expectedSeverity: 'error' },
        { status: 500, expectedSeverity: 'fatal' },
      ];

      testCases.forEach(({ status, expectedSeverity }) => {
        const result = FhirErrorService.createOperationOutcome(status, 'Test');
        expect(result.issue[0]?.severity).toBe(expectedSeverity);
      });
    });

    it('should map status codes to correct issue codes', () => {
      const testCases = [
        { status: 400, expectedCode: 'invalid' },
        { status: 401, expectedCode: 'security' },
        { status: 403, expectedCode: 'forbidden' },
        { status: 404, expectedCode: 'not-found' },
        { status: 500, expectedCode: 'exception' },
        { status: 999, expectedCode: 'processing' }, // Default
      ];

      testCases.forEach(({ status, expectedCode }) => {
        const result = FhirErrorService.createOperationOutcome(status, 'Test');
        expect(result.issue[0]?.code).toBe(expectedCode);
      });
    });
  });

  describe('createValidationError', () => {
    it('should create validation error OperationOutcome', () => {
      const errors = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Email is invalid' },
      ];

      const result = FhirErrorService.createValidationError(errors);

      expect(result.resourceType).toBe('OperationOutcome');
      expect(result.issue.length).toBe(2);
      expect(result.issue[0]?.severity).toBe('error');
      expect(result.issue[0]?.code).toBe('invalid');
      expect(result.issue[0]?.details?.text).toBe('Name is required');
      expect(result.issue[0]?.location).toEqual(['name']);
      expect(result.issue[1]?.details?.text).toBe('Email is invalid');
      expect(result.issue[1]?.location).toEqual(['email']);
    });

    it('should handle empty errors array', () => {
      const result = FhirErrorService.createValidationError([]);

      expect(result.issue.length).toBe(0);
    });
  });

  describe('createNotFoundError', () => {
    it('should create not found error OperationOutcome', () => {
      const result = FhirErrorService.createNotFoundError('Patient', '123');

      expect(result.resourceType).toBe('OperationOutcome');
      expect(result.issue.length).toBe(1);
      expect(result.issue[0]?.severity).toBe('error');
      expect(result.issue[0]?.code).toBe('not-found');
      expect(result.issue[0]?.details?.text).toBe('Patient with ID 123 not found');
      expect(result.issue[0]?.diagnostics).toBe(
        'The requested Patient resource with ID 123 does not exist',
      );
    });
  });

  describe('createUnauthorizedError', () => {
    it('should create unauthorized error OperationOutcome with default message', () => {
      const result = FhirErrorService.createUnauthorizedError();

      expect(result.resourceType).toBe('OperationOutcome');
      expect(result.issue.length).toBe(1);
      expect(result.issue[0]?.severity).toBe('error');
      expect(result.issue[0]?.code).toBe('security');
      expect(result.issue[0]?.details?.text).toBe('Authentication required');
      expect(result.issue[0]?.diagnostics).toBe('The request requires authentication');
    });

    it('should create unauthorized error OperationOutcome with custom message', () => {
      const result = FhirErrorService.createUnauthorizedError('Custom auth message');

      expect(result.issue[0]?.details?.text).toBe('Custom auth message');
    });
  });

  describe('createForbiddenError', () => {
    it('should create forbidden error OperationOutcome with default message', () => {
      const result = FhirErrorService.createForbiddenError();

      expect(result.resourceType).toBe('OperationOutcome');
      expect(result.issue.length).toBe(1);
      expect(result.issue[0]?.severity).toBe('error');
      expect(result.issue[0]?.code).toBe('forbidden');
      expect(result.issue[0]?.details?.text).toBe('Access denied');
      expect(result.issue[0]?.diagnostics).toBe(
        'The request is not authorized to access this resource',
      );
    });

    it('should create forbidden error OperationOutcome with custom message', () => {
      const result = FhirErrorService.createForbiddenError('Custom forbidden message');

      expect(result.issue[0]?.details?.text).toBe('Custom forbidden message');
    });
  });

  describe('createInternalError', () => {
    it('should create internal error OperationOutcome with default message', () => {
      const result = FhirErrorService.createInternalError();

      expect(result.resourceType).toBe('OperationOutcome');
      expect(result.issue.length).toBe(1);
      expect(result.issue[0]?.severity).toBe('fatal');
      expect(result.issue[0]?.code).toBe('exception');
      expect(result.issue[0]?.details?.text).toBe('Internal server error');
      expect(result.issue[0]?.diagnostics).toBe(
        'An unexpected error occurred while processing the request',
      );
    });

    it('should create internal error OperationOutcome with custom message', () => {
      const result = FhirErrorService.createInternalError('Custom internal error');

      expect(result.issue[0]?.details?.text).toBe('Custom internal error');
    });
  });

  describe('OperationOutcome structure', () => {
    it('should always include required fields', () => {
      const result = FhirErrorService.createOperationOutcome(400, 'Test');

      expect(result).toHaveProperty('resourceType');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('issue');
      expect(result.meta).toHaveProperty('lastUpdated');
      expect(Array.isArray(result.issue)).toBe(true);
    });

    it('should generate unique IDs', async () => {
      const result1 = FhirErrorService.createOperationOutcome(400, 'Test 1');
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result2 = FhirErrorService.createOperationOutcome(400, 'Test 2');

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      // IDs should be different (based on timestamp)
      expect(result1.id).not.toBe(result2.id);
    });
  });
});
