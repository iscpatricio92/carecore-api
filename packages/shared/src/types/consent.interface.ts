/**
 * Consent-related interfaces
 *
 * These types are shared between mobile and web applications
 * for creating and managing FHIR Consent resources
 *
 * Note: Base types (ConsentPolicy, ConsentVerification, ConsentProvision, etc.)
 * are defined in fhir.interface.ts and are imported here.
 */

import type { ConsentPolicy, ConsentVerification, ConsentProvision } from './fhir.interface';

/**
 * Create Consent Payload
 *
 * Structure for creating a new FHIR Consent resource.
 * This matches the CreateConsentDto structure from the API but without NestJS validation decorators.
 *
 * Used by both mobile and web applications when creating consent resources.
 *
 * @example
 * {
 *   "status": "active",
 *   "scope": {
 *     "coding": [{
 *       "system": "http://terminology.hl7.org/CodeSystem/consentscope",
 *       "code": "patient-privacy",
 *       "display": "Privacy Consent"
 *     }]
 *   },
 *   "category": [{
 *     "coding": [{
 *       "system": "http://terminology.hl7.org/CodeSystem/consentcategorycodes",
 *       "code": "59284-0",
 *       "display": "Patient Consent"
 *     }]
 *   }],
 *   "patient": {
 *     "reference": "Patient/123",
 *     "display": "John Doe"
 *   },
 *   "dateTime": "2024-01-15T10:30:00Z"
 * }
 */
export interface CreateConsentPayload {
  /**
   * Consent identifiers
   */
  identifier?: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary';
    system?: string;
    value: string;
  }>;

  /**
   * Consent status
   */
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';

  /**
   * Scope of consent
   */
  scope: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  /**
   * Consent categories
   */
  category: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  /**
   * Reference to the patient
   */
  patient: {
    reference: string;
    display?: string;
  };

  /**
   * Date/time of consent (ISO 8601)
   */
  dateTime?: string;

  /**
   * Who performed the consent
   */
  performer?: Array<{
    reference: string;
    display?: string;
  }>;

  /**
   * Organization managing consent
   */
  organization?: Array<{
    reference: string;
    display?: string;
  }>;

  /**
   * Source of consent (attachment)
   */
  sourceAttachment?: {
    contentType?: string;
    url?: string;
    title?: string;
  };

  /**
   * Source of consent (reference)
   */
  sourceReference?: {
    reference: string;
    display?: string;
  };

  /**
   * Policies related to consent
   */
  policy?: ConsentPolicy[];

  /**
   * Policy rule
   */
  policyRule?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  /**
   * Verification details
   */
  verification?: ConsentVerification[];

  /**
   * Consent provisions
   */
  provision?: ConsentProvision;
}

/**
 * Update Consent Payload
 *
 * Structure for updating an existing FHIR Consent resource.
 * All fields are optional for partial updates.
 *
 * Used by both mobile and web applications when updating consent resources.
 */
export interface UpdateConsentPayload {
  /**
   * Consent identifiers
   */
  identifier?: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary';
    system?: string;
    value: string;
  }>;

  /**
   * Consent status
   */
  status?: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';

  /**
   * Scope of consent
   */
  scope?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  /**
   * Consent categories
   */
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;

  /**
   * Reference to the patient
   */
  patient?: {
    reference: string;
    display?: string;
  };

  /**
   * Date/time of consent (ISO 8601)
   */
  dateTime?: string;

  /**
   * Who performed the consent
   */
  performer?: Array<{
    reference: string;
    display?: string;
  }>;

  /**
   * Organization managing consent
   */
  organization?: Array<{
    reference: string;
    display?: string;
  }>;

  /**
   * Source of consent (attachment)
   */
  sourceAttachment?: {
    contentType?: string;
    url?: string;
    title?: string;
  };

  /**
   * Source of consent (reference)
   */
  sourceReference?: {
    reference: string;
    display?: string;
  };

  /**
   * Policies related to consent
   */
  policy?: ConsentPolicy[];

  /**
   * Policy rule
   */
  policyRule?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };

  /**
   * Verification details
   */
  verification?: ConsentVerification[];

  /**
   * Consent provisions
   */
  provision?: ConsentProvision;
}

/**
 * Share Consent with Practitioner Payload
 *
 * Structure for sharing a consent with a practitioner for a specific number of days.
 *
 * @example
 * {
 *   "practitionerReference": "Practitioner/123",
 *   "days": 30,
 *   "practitionerDisplay": "Dr. Jane Smith"
 * }
 */
export interface ShareConsentWithPractitionerPayload {
  /**
   * Reference to the practitioner (format: Practitioner/{id})
   */
  practitionerReference: string;

  /**
   * Display name of the practitioner
   */
  practitionerDisplay?: string;

  /**
   * Number of days the consent will be valid (1-365)
   */
  days: number;
}
