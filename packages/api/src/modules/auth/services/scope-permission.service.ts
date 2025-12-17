import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { User, FHIR_RESOURCE_TYPES, FHIR_ACTIONS, SCOPE_PERMISSIONS_MAP } from '@carecore/shared';
import { ROLES } from '../../../common/constants/roles';
import { fhirScope } from '../decorators/scopes.decorator';

/**
 * Scope Permission Mapping
 *
 * Maps OAuth2 scopes to FHIR resource permissions.
 * Each scope corresponds to a specific resource type and action.
 */
export interface ScopePermission {
  resource: string;
  action: string;
}

/**
 * Scope Permission Service
 *
 * This service provides methods to:
 * - Map OAuth2 scopes to FHIR resource permissions
 * - Validate if a user has required scopes for a resource/action
 * - Generate scope strings from resource types and actions
 * - Parse scope strings to extract resource and action
 * - Combine role-based and scope-based authorization
 */
@Injectable()
export class ScopePermissionService {
  /**
   * Mapping of OAuth2 scopes to FHIR resource permissions
   * Uses the centralized SCOPE_PERMISSIONS_MAP from constants
   */
  private readonly SCOPE_PERMISSIONS: Record<string, ScopePermission> =
    SCOPE_PERMISSIONS_MAP as Record<string, ScopePermission>;

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ScopePermissionService.name);
  }

  /**
   * Check if a scope grants permission for a specific resource and action
   * @param scope - OAuth2 scope string (e.g., 'patient:read')
   * @param resourceType - FHIR resource type (e.g., 'Patient')
   * @param action - Action type (e.g., 'read', 'write', 'share')
   * @returns true if the scope grants the permission
   */
  hasPermission(scope: string, resourceType: string, action: string): boolean {
    const permission = this.SCOPE_PERMISSIONS[scope];
    if (!permission) {
      return false;
    }

    return permission.resource === resourceType && permission.action === action;
  }

  /**
   * Get required scopes for a specific resource and action
   * @param resourceType - FHIR resource type (e.g., 'Patient')
   * @param action - Action type (e.g., 'read', 'write', 'share')
   * @returns Array of scope strings required for the permission
   */
  getRequiredScopes(resourceType: string, action: string): string[] {
    // Normalize resource type (handle DocumentReference vs document)
    const normalizedResource = this.normalizeResourceType(resourceType);
    const scope = fhirScope(normalizedResource, action);

    // Check if the scope exists in our mapping
    if (this.SCOPE_PERMISSIONS[scope]) {
      return [scope];
    }

    // If not found, return empty array (no scopes required or invalid)
    return [];
  }

  /**
   * Validate if user has all required scopes
   * @param userScopes - Array of scopes the user has
   * @param requiredScopes - Array of scopes required
   * @returns true if user has all required scopes
   */
  validateScopes(userScopes: string[], requiredScopes: string[]): boolean {
    if (requiredScopes.length === 0) {
      return true; // No scopes required
    }

    return requiredScopes.every((scope) => userScopes.includes(scope));
  }

  /**
   * Check if user has permission for a resource/action (combines roles and scopes)
   * Admin role automatically has all permissions
   * @param user - Current authenticated user
   * @param resourceType - FHIR resource type
   * @param action - Action type
   * @returns true if user has permission
   */
  hasResourcePermission(user: User, resourceType: string, action: string): boolean {
    // Admin has all permissions
    if (user.roles?.includes(ROLES.ADMIN)) {
      this.logger.debug(
        { userId: user.id, resourceType, action },
        'Admin user has all permissions',
      );
      return true;
    }

    // Get required scopes for this resource/action
    const requiredScopes = this.getRequiredScopes(resourceType, action);

    // If no scopes are required for this resource/action, deny by default
    // (unless handled by role-based access)
    if (requiredScopes.length === 0) {
      this.logger.debug(
        { userId: user.id, resourceType, action },
        'No scopes defined for resource/action',
      );
      return false;
    }

    // Check if user has required scopes
    const userScopes = user.scopes || [];
    const hasScopes = this.validateScopes(userScopes, requiredScopes);

    if (hasScopes) {
      this.logger.debug(
        { userId: user.id, resourceType, action, scopes: requiredScopes },
        'User has required scopes',
      );
    } else {
      this.logger.debug(
        {
          userId: user.id,
          resourceType,
          action,
          requiredScopes,
          userScopes,
        },
        'User missing required scopes',
      );
    }

    return hasScopes;
  }

  /**
   * Get scope string for a resource and action
   * @param resourceType - FHIR resource type
   * @param action - Action type
   * @returns Scope string (e.g., 'patient:read')
   */
  getScopeForResource(resourceType: string, action: string): string {
    const normalizedResource = this.normalizeResourceType(resourceType);
    return fhirScope(normalizedResource, action);
  }

  /**
   * Parse a scope string to extract resource and action
   * @param scope - Scope string (e.g., 'patient:read')
   * @returns Object with resource and action, or null if invalid
   */
  parseScope(scope: string): ScopePermission | null {
    const permission = this.SCOPE_PERMISSIONS[scope];
    return permission || null;
  }

  /**
   * Get all available scopes
   * @returns Array of all scope strings
   */
  getAllScopes(): string[] {
    return Object.keys(this.SCOPE_PERMISSIONS);
  }

  /**
   * Get all scopes for a specific resource type
   * @param resourceType - FHIR resource type
   * @returns Array of scope strings for the resource
   */
  getScopesForResource(resourceType: string): string[] {
    const normalizedResource = this.normalizeResourceType(resourceType);
    return Object.keys(this.SCOPE_PERMISSIONS).filter((scope) =>
      scope.startsWith(`${normalizedResource}:`),
    );
  }

  /**
   * Normalize resource type name for scope generation
   * Converts 'DocumentReference' to 'document', 'Patient' to 'patient', etc.
   * @param resourceType - FHIR resource type
   * @returns Normalized resource name for scope
   */
  private normalizeResourceType(resourceType: string): string {
    // Map FHIR resource types to scope resource names
    const resourceMap: Record<string, string> = {
      [FHIR_RESOURCE_TYPES.PATIENT]: 'patient',
      [FHIR_RESOURCE_TYPES.PRACTITIONER]: 'practitioner',
      [FHIR_RESOURCE_TYPES.ENCOUNTER]: 'encounter',
      [FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE]: 'document',
      [FHIR_RESOURCE_TYPES.CONSENT]: 'consent',
    };

    return resourceMap[resourceType] || resourceType.toLowerCase();
  }

  /**
   * Check if a role automatically grants certain scopes
   * Admin role grants all scopes
   * Practitioner role grants read/write scopes for their resources
   * @param user - Current authenticated user
   * @param resourceType - FHIR resource type
   * @param action - Action type
   * @returns true if role grants permission
   */
  roleGrantsPermission(user: User, resourceType: string, action: string): boolean {
    // Admin has all permissions
    if (user.roles?.includes(ROLES.ADMIN)) {
      return true;
    }

    // Practitioner has read/write access to encounters and documents
    if (user.roles?.includes(ROLES.PRACTITIONER)) {
      if (
        resourceType === FHIR_RESOURCE_TYPES.ENCOUNTER &&
        (action === FHIR_ACTIONS.READ || action === FHIR_ACTIONS.WRITE)
      ) {
        return true;
      }
      if (
        resourceType === FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE &&
        (action === FHIR_ACTIONS.READ || action === FHIR_ACTIONS.WRITE)
      ) {
        return true;
      }
      // Practitioners can read patients (for assigned patients)
      if (resourceType === FHIR_RESOURCE_TYPES.PATIENT && action === FHIR_ACTIONS.READ) {
        return true;
      }
    }

    return false;
  }
}
