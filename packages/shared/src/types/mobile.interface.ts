/**
 * Mobile-specific types and interfaces
 *
 * These types are specific to the mobile application but may be useful
 * for consistency across the mobile codebase.
 */

/**
 * Resource filter type for filtering FHIR resources by type
 * Used in History screen to filter between Encounters and DocumentReferences
 */
export type ResourceFilter = 'all' | 'Encounter' | 'DocumentReference';

/**
 * Date filter type for filtering resources by date range
 * Used in History screen to filter by time period
 */
export type DateFilter = 'all' | 'week' | 'month' | 'year';

/**
 * Consent status filter type
 * Used in Consents screen to filter consentimientos by status
 */
export type ConsentStatusFilter = 'all' | 'active' | 'revoked' | 'expired';
