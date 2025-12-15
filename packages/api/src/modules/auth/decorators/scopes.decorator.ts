import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for scopes decorator
 */
export const SCOPES_KEY = 'scopes';

/**
 * Scopes decorator
 *
 * This decorator is used to specify which OAuth2 scopes are required to access an endpoint.
 * It works together with the `ScopesGuard` to validate that the user's token contains
 * all the required scopes.
 *
 * @param scopes - Array of scope strings required to access the endpoint
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @Scopes('patient:read')
 * @UseGuards(JwtAuthGuard, ScopesGuard)
 * async getPatient(@Param('id') id: string) {
 *   // ...
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Post()
 * @Scopes('patient:write')
 * @UseGuards(JwtAuthGuard, ScopesGuard)
 * async createPatient(@Body() dto: CreatePatientDto) {
 *   // ...
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Multiple scopes (user must have ALL of them)
 * @Post(':id/share')
 * @Scopes('consent:read', 'consent:share')
 * @UseGuards(JwtAuthGuard, ScopesGuard)
 * async shareConsent(@Param('id') id: string) {
 *   // ...
 * }
 * ```
 */
export const Scopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);

/**
 * Helper function to generate FHIR scope strings
 *
 * @param resource - FHIR resource type (e.g., 'patient', 'practitioner', 'encounter')
 * @param action - Action type (e.g., 'read', 'write', 'share')
 * @returns Scope string in format "resource:action"
 *
 * @example
 * ```typescript
 * fhirScope('patient', 'read') // Returns 'patient:read'
 * fhirScope('consent', 'share') // Returns 'consent:share'
 * ```
 */
export const fhirScope = (resource: string, action: string): string => {
  return `${resource}:${action}`;
};
