'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SCOPE_PERMISSIONS_MAP = exports.ALL_FHIR_SCOPES = exports.FHIR_SCOPES = void 0;
exports.isValidFhirScope = isValidFhirScope;
const fhir_resource_types_1 = require('./fhir-resource-types');
const fhir_actions_1 = require('./fhir-actions');
exports.FHIR_SCOPES = {
  PATIENT_READ: 'patient:read',
  PATIENT_WRITE: 'patient:write',
  PRACTITIONER_READ: 'practitioner:read',
  PRACTITIONER_WRITE: 'practitioner:write',
  ENCOUNTER_READ: 'encounter:read',
  ENCOUNTER_WRITE: 'encounter:write',
  DOCUMENT_READ: 'document:read',
  DOCUMENT_WRITE: 'document:write',
  CONSENT_READ: 'consent:read',
  CONSENT_WRITE: 'consent:write',
  CONSENT_SHARE: 'consent:share',
};
exports.ALL_FHIR_SCOPES = Object.values(exports.FHIR_SCOPES);
function isValidFhirScope(scope) {
  return exports.ALL_FHIR_SCOPES.includes(scope);
}
exports.SCOPE_PERMISSIONS_MAP = {
  [exports.FHIR_SCOPES.PATIENT_READ]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.PATIENT,
    action: fhir_actions_1.FHIR_ACTIONS.READ,
  },
  [exports.FHIR_SCOPES.PATIENT_WRITE]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.PATIENT,
    action: fhir_actions_1.FHIR_ACTIONS.WRITE,
  },
  [exports.FHIR_SCOPES.PRACTITIONER_READ]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.PRACTITIONER,
    action: fhir_actions_1.FHIR_ACTIONS.READ,
  },
  [exports.FHIR_SCOPES.PRACTITIONER_WRITE]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.PRACTITIONER,
    action: fhir_actions_1.FHIR_ACTIONS.WRITE,
  },
  [exports.FHIR_SCOPES.ENCOUNTER_READ]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.ENCOUNTER,
    action: fhir_actions_1.FHIR_ACTIONS.READ,
  },
  [exports.FHIR_SCOPES.ENCOUNTER_WRITE]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.ENCOUNTER,
    action: fhir_actions_1.FHIR_ACTIONS.WRITE,
  },
  [exports.FHIR_SCOPES.DOCUMENT_READ]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
    action: fhir_actions_1.FHIR_ACTIONS.READ,
  },
  [exports.FHIR_SCOPES.DOCUMENT_WRITE]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
    action: fhir_actions_1.FHIR_ACTIONS.WRITE,
  },
  [exports.FHIR_SCOPES.CONSENT_READ]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.CONSENT,
    action: fhir_actions_1.FHIR_ACTIONS.READ,
  },
  [exports.FHIR_SCOPES.CONSENT_WRITE]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.CONSENT,
    action: fhir_actions_1.FHIR_ACTIONS.WRITE,
  },
  [exports.FHIR_SCOPES.CONSENT_SHARE]: {
    resource: fhir_resource_types_1.FHIR_RESOURCE_TYPES.CONSENT,
    action: fhir_actions_1.FHIR_ACTIONS.SHARE,
  },
};
//# sourceMappingURL=fhir-scopes.js.map
