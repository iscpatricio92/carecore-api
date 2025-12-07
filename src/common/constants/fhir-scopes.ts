/**
 * FHIR Scope Constants
 *
 * Defines all OAuth2 scopes available for FHIR resources.
 * These constants ensure type safety and prevent typos when working with scopes.
 *
 * Scopes follow the format: "resource:action"
 * Example: "patient:read", "consent:write", "consent:share"
 */

import { FHIR_RESOURCE_TYPES } from './fhir-resource-types';
import { FHIR_ACTIONS } from './fhir-actions';

/**
 * FHIR Scopes
 *
 * These constants represent the OAuth2 scopes available for FHIR resources.
 * Use these constants instead of string literals to ensure type safety and consistency.
 */
export const FHIR_SCOPES = {
  // Patient scopes
  PATIENT_READ: 'patient:read',
  PATIENT_WRITE: 'patient:write',

  // Practitioner scopes
  PRACTITIONER_READ: 'practitioner:read',
  PRACTITIONER_WRITE: 'practitioner:write',

  // Encounter scopes
  ENCOUNTER_READ: 'encounter:read',
  ENCOUNTER_WRITE: 'encounter:write',

  // Document scopes
  DOCUMENT_READ: 'document:read',
  DOCUMENT_WRITE: 'document:write',

  // Consent scopes
  CONSENT_READ: 'consent:read',
  CONSENT_WRITE: 'consent:write',
  CONSENT_SHARE: 'consent:share',
} as const;

/**
 * Type for FHIR scope values
 */
export type FhirScope = (typeof FHIR_SCOPES)[keyof typeof FHIR_SCOPES];

/**
 * Array of all FHIR scope values
 * Useful for validation and iteration
 */
export const ALL_FHIR_SCOPES: readonly FhirScope[] = Object.values(FHIR_SCOPES);

/**
 * Check if a string is a valid FHIR scope
 * @param scope - String to check
 * @returns true if the string is a valid FHIR scope
 */
export function isValidFhirScope(scope: string): scope is FhirScope {
  return ALL_FHIR_SCOPES.includes(scope as FhirScope);
}

/**
 * Mapping of OAuth2 scopes to FHIR resource permissions
 * Format: 'resource:action' -> { resource: 'ResourceType', action: 'action' }
 *
 * This mapping is used by ScopePermissionService to validate permissions.
 */
export const SCOPE_PERMISSIONS_MAP: Record<FhirScope, { resource: string; action: string }> = {
  [FHIR_SCOPES.PATIENT_READ]: { resource: FHIR_RESOURCE_TYPES.PATIENT, action: FHIR_ACTIONS.READ },
  [FHIR_SCOPES.PATIENT_WRITE]: {
    resource: FHIR_RESOURCE_TYPES.PATIENT,
    action: FHIR_ACTIONS.WRITE,
  },
  [FHIR_SCOPES.PRACTITIONER_READ]: {
    resource: FHIR_RESOURCE_TYPES.PRACTITIONER,
    action: FHIR_ACTIONS.READ,
  },
  [FHIR_SCOPES.PRACTITIONER_WRITE]: {
    resource: FHIR_RESOURCE_TYPES.PRACTITIONER,
    action: FHIR_ACTIONS.WRITE,
  },
  [FHIR_SCOPES.ENCOUNTER_READ]: {
    resource: FHIR_RESOURCE_TYPES.ENCOUNTER,
    action: FHIR_ACTIONS.READ,
  },
  [FHIR_SCOPES.ENCOUNTER_WRITE]: {
    resource: FHIR_RESOURCE_TYPES.ENCOUNTER,
    action: FHIR_ACTIONS.WRITE,
  },
  [FHIR_SCOPES.DOCUMENT_READ]: {
    resource: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
    action: FHIR_ACTIONS.READ,
  },
  [FHIR_SCOPES.DOCUMENT_WRITE]: {
    resource: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
    action: FHIR_ACTIONS.WRITE,
  },
  [FHIR_SCOPES.CONSENT_READ]: {
    resource: FHIR_RESOURCE_TYPES.CONSENT,
    action: FHIR_ACTIONS.READ,
  },
  [FHIR_SCOPES.CONSENT_WRITE]: {
    resource: FHIR_RESOURCE_TYPES.CONSENT,
    action: FHIR_ACTIONS.WRITE,
  },
  [FHIR_SCOPES.CONSENT_SHARE]: {
    resource: FHIR_RESOURCE_TYPES.CONSENT,
    action: FHIR_ACTIONS.SHARE,
  },
} as const;
