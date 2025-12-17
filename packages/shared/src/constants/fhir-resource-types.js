'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MODULE_TO_RESOURCE_TYPE =
  exports.ALL_FHIR_RESOURCE_TYPES =
  exports.FHIR_RESOURCE_TYPES =
    void 0;
exports.isValidFhirResourceType = isValidFhirResourceType;
exports.FHIR_RESOURCE_TYPES = {
  PATIENT: 'Patient',
  PRACTITIONER: 'Practitioner',
  ENCOUNTER: 'Encounter',
  CONSENT: 'Consent',
  DOCUMENT_REFERENCE: 'DocumentReference',
  OBSERVATION: 'Observation',
  CONDITION: 'Condition',
  MEDICATION: 'Medication',
  PROCEDURE: 'Procedure',
};
exports.ALL_FHIR_RESOURCE_TYPES = Object.values(exports.FHIR_RESOURCE_TYPES);
function isValidFhirResourceType(resourceType) {
  return exports.ALL_FHIR_RESOURCE_TYPES.includes(resourceType);
}
exports.MODULE_TO_RESOURCE_TYPE = {
  patients: exports.FHIR_RESOURCE_TYPES.PATIENT,
  practitioners: exports.FHIR_RESOURCE_TYPES.PRACTITIONER,
  encounters: exports.FHIR_RESOURCE_TYPES.ENCOUNTER,
  consents: exports.FHIR_RESOURCE_TYPES.CONSENT,
  documents: exports.FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
};
//# sourceMappingURL=fhir-resource-types.js.map
