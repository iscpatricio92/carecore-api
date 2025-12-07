/**
 * FHIR Action Constants
 *
 * Defines all available actions that can be performed on FHIR resources.
 * These constants ensure type safety and prevent typos when working with resource permissions.
 *
 * Actions represent operations that can be performed on FHIR resources:
 * - read: Read/view a resource
 * - write: Create, update, or delete a resource
 * - share: Share a resource with another entity (e.g., consent sharing)
 */

/**
 * FHIR Actions
 *
 * These constants represent the actions that can be performed on FHIR resources.
 * Use these constants instead of string literals to ensure type safety and consistency.
 */
export const FHIR_ACTIONS = {
  /**
   * Read action
   * Allows reading/viewing a resource
   */
  READ: 'read',

  /**
   * Write action
   * Allows creating, updating, or deleting a resource
   */
  WRITE: 'write',

  /**
   * Share action
   * Allows sharing a resource with another entity
   * Currently used for Consent resources
   */
  SHARE: 'share',
} as const;

/**
 * Type for FHIR action values
 */
export type FhirAction = (typeof FHIR_ACTIONS)[keyof typeof FHIR_ACTIONS];

/**
 * Array of all FHIR action values
 * Useful for validation and iteration
 */
export const ALL_FHIR_ACTIONS: readonly FhirAction[] = Object.values(FHIR_ACTIONS);

/**
 * Check if a string is a valid FHIR action
 * @param action - String to check
 * @returns true if the string is a valid FHIR action
 */
export function isValidFhirAction(action: string): action is FhirAction {
  return ALL_FHIR_ACTIONS.includes(action as FhirAction);
}
