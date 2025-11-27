import { OperationOutcome, OperationOutcomeIssue } from '../interfaces/fhir.interface';

/**
 * Service for creating FHIR-compliant error responses (OperationOutcome)
 */
export class FhirErrorService {
  /**
   * Maps HTTP status codes to FHIR issue severity
   */
  private static getSeverity(statusCode: number): OperationOutcomeIssue['severity'] {
    if (statusCode >= 500) return 'fatal';
    if (statusCode >= 400) return 'error';
    if (statusCode >= 300) return 'warning';
    return 'information';
  }

  /**
   * Maps HTTP status codes to FHIR issue codes
   * Based on FHIR HTTP Status Code mapping: https://www.hl7.org/fhir/http.html
   */
  private static getIssueCode(statusCode: number): string {
    const codeMap: Record<number, string> = {
      400: 'invalid',
      401: 'security',
      403: 'forbidden',
      404: 'not-found',
      405: 'not-supported',
      409: 'duplicate',
      412: 'conflict',
      422: 'processing',
      500: 'exception',
      501: 'not-supported',
    };

    return codeMap[statusCode] || 'processing';
  }

  /**
   * Creates an OperationOutcome from an error
   */
  static createOperationOutcome(
    statusCode: number,
    message: string | string[] | Record<string, unknown>,
    diagnostics?: string,
    location?: string[],
  ): OperationOutcome {
    const messages = Array.isArray(message) ? message : [String(message)];
    const severity = this.getSeverity(statusCode);
    const code = this.getIssueCode(statusCode);

    const issues: OperationOutcomeIssue[] = messages.map((msg) => {
      const issue: OperationOutcomeIssue = {
        severity,
        code,
        details: {
          text: typeof msg === 'string' ? msg : JSON.stringify(msg),
        },
      };

      if (diagnostics) {
        issue.diagnostics = diagnostics;
      }

      if (location && location.length > 0) {
        issue.location = location;
      }

      return issue;
    });

    return {
      resourceType: 'OperationOutcome',
      id: `op-${Date.now()}`,
      meta: {
        lastUpdated: new Date().toISOString(),
      },
      issue: issues,
    };
  }

  /**
   * Creates an OperationOutcome for validation errors
   */
  static createValidationError(
    errors: Array<{ field: string; message: string }>,
  ): OperationOutcome {
    const issues: OperationOutcomeIssue[] = errors.map((error) => ({
      severity: 'error',
      code: 'invalid',
      details: {
        text: error.message,
      },
      location: [error.field],
    }));

    return {
      resourceType: 'OperationOutcome',
      id: `op-${Date.now()}`,
      meta: {
        lastUpdated: new Date().toISOString(),
      },
      issue: issues,
    };
  }

  /**
   * Creates an OperationOutcome for not found errors
   */
  static createNotFoundError(resourceType: string, id: string): OperationOutcome {
    return {
      resourceType: 'OperationOutcome',
      id: `op-${Date.now()}`,
      meta: {
        lastUpdated: new Date().toISOString(),
      },
      issue: [
        {
          severity: 'error',
          code: 'not-found',
          details: {
            text: `${resourceType} with ID ${id} not found`,
          },
          diagnostics: `The requested ${resourceType} resource with ID ${id} does not exist`,
        },
      ],
    };
  }

  /**
   * Creates an OperationOutcome for unauthorized errors
   */
  static createUnauthorizedError(message = 'Authentication required'): OperationOutcome {
    return {
      resourceType: 'OperationOutcome',
      id: `op-${Date.now()}`,
      meta: {
        lastUpdated: new Date().toISOString(),
      },
      issue: [
        {
          severity: 'error',
          code: 'security',
          details: {
            text: message,
          },
          diagnostics: 'The request requires authentication',
        },
      ],
    };
  }

  /**
   * Creates an OperationOutcome for forbidden errors
   */
  static createForbiddenError(message = 'Access denied'): OperationOutcome {
    return {
      resourceType: 'OperationOutcome',
      id: `op-${Date.now()}`,
      meta: {
        lastUpdated: new Date().toISOString(),
      },
      issue: [
        {
          severity: 'error',
          code: 'forbidden',
          details: {
            text: message,
          },
          diagnostics: 'The request is not authorized to access this resource',
        },
      ],
    };
  }

  /**
   * Creates an OperationOutcome for internal server errors
   */
  static createInternalError(message = 'Internal server error'): OperationOutcome {
    return {
      resourceType: 'OperationOutcome',
      id: `op-${Date.now()}`,
      meta: {
        lastUpdated: new Date().toISOString(),
      },
      issue: [
        {
          severity: 'fatal',
          code: 'exception',
          details: {
            text: message,
          },
          diagnostics: 'An unexpected error occurred while processing the request',
        },
      ],
    };
  }
}
