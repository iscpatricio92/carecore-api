'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ALL_FHIR_ACTIONS = exports.FHIR_ACTIONS = void 0;
exports.isValidFhirAction = isValidFhirAction;
exports.FHIR_ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  SHARE: 'share',
};
exports.ALL_FHIR_ACTIONS = Object.values(exports.FHIR_ACTIONS);
function isValidFhirAction(action) {
  return exports.ALL_FHIR_ACTIONS.includes(action);
}
//# sourceMappingURL=fhir-actions.js.map
