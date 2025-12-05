import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import KcAdminClient from '@keycloak/keycloak-admin-client';

/**
 * Keycloak Admin Service
 *
 * Handles administrative operations with Keycloak using the Admin REST API.
 * This service is used to manage user roles, attributes, and other administrative tasks.
 *
 * Note: This service requires Keycloak Admin API credentials configured in environment variables.
 */
@Injectable()
export class KeycloakAdminService {
  private readonly keycloakUrl: string;
  private readonly keycloakRealm: string;
  private readonly adminClientId: string;
  private readonly adminClientSecret: string;
  private kcAdminClient: KcAdminClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(KeycloakAdminService.name);

    // Get Keycloak configuration
    this.keycloakUrl = this.configService.get<string>('KEYCLOAK_URL') || '';
    this.keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'carecore';
    this.adminClientId = this.configService.get<string>('KEYCLOAK_ADMIN_CLIENT_ID') || '';
    this.adminClientSecret = this.configService.get<string>('KEYCLOAK_ADMIN_CLIENT_SECRET') || '';

    // Validate required configuration
    if (!this.keycloakUrl) {
      this.logger.warn('KEYCLOAK_URL is not configured. Keycloak Admin operations will fail.');
    }

    if (!this.adminClientId || !this.adminClientSecret) {
      this.logger.warn(
        'KEYCLOAK_ADMIN_CLIENT_ID or KEYCLOAK_ADMIN_CLIENT_SECRET is not configured. Keycloak Admin operations will fail.',
      );
    }

    // Initialize Keycloak Admin Client
    this.kcAdminClient = new KcAdminClient({
      baseUrl: this.keycloakUrl,
      realmName: this.keycloakRealm,
    });
  }

  /**
   * Authenticate with Keycloak Admin API
   * This method must be called before any admin operations
   */
  private async authenticate(): Promise<void> {
    try {
      await this.kcAdminClient.auth({
        grantType: 'client_credentials',
        clientId: this.adminClientId,
        clientSecret: this.adminClientSecret,
      });

      this.logger.debug('Authenticated with Keycloak Admin API');
    } catch (error) {
      this.logger.error({ error }, 'Failed to authenticate with Keycloak Admin API');
      throw new BadRequestException('Failed to authenticate with Keycloak Admin API');
    }
  }

  /**
   * Find a user by Keycloak user ID
   * @param userId Keycloak user ID
   * @returns User representation from Keycloak
   */
  async findUserById(
    userId: string,
  ): Promise<{ id?: string; username?: string; email?: string } | null> {
    try {
      await this.authenticate();

      const user = await this.kcAdminClient.users.findOne({
        id: userId,
      });

      return user || null;
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to find user in Keycloak');
      return null;
    }
  }

  /**
   * Get all roles assigned to a user
   * @param userId Keycloak user ID
   * @returns Array of role names
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      await this.authenticate();

      // Get realm roles
      const realmRoles = await this.kcAdminClient.users.listRealmRoleMappings({
        id: userId,
      });

      return realmRoles.map((role) => role.name || '');
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to get user roles from Keycloak');
      return [];
    }
  }

  /**
   * Add a role to a user
   * @param userId Keycloak user ID
   * @param roleName Name of the role to add
   * @returns True if successful, false otherwise
   */
  async addRoleToUser(userId: string, roleName: string): Promise<boolean> {
    try {
      await this.authenticate();

      // Find the role
      const roles = await this.kcAdminClient.roles.find({
        search: roleName,
      });

      // Filter to exact match
      const exactRole = roles.find((role) => role.name === roleName);
      if (!exactRole || !exactRole.id) {
        this.logger.warn({ roleName }, 'Role not found in Keycloak');
        return false;
      }

      const role = exactRole;

      // Add role to user
      await this.kcAdminClient.users.addRealmRoleMappings({
        id: userId,
        roles: [
          {
            id: role.id!,
            name: role.name!,
          },
        ],
      });

      this.logger.info({ userId, roleName }, 'Role added to user in Keycloak');
      return true;
    } catch (error) {
      this.logger.error({ error, userId, roleName }, 'Failed to add role to user in Keycloak');
      return false;
    }
  }

  /**
   * Remove a role from a user
   * @param userId Keycloak user ID
   * @param roleName Name of the role to remove
   * @returns True if successful, false otherwise
   */
  async removeRoleFromUser(userId: string, roleName: string): Promise<boolean> {
    try {
      await this.authenticate();

      // Find the role
      const roles = await this.kcAdminClient.roles.find({
        search: roleName,
      });

      // Filter to exact match
      const exactRole = roles.find((role) => role.name === roleName);
      if (!exactRole || !exactRole.id) {
        this.logger.warn({ roleName }, 'Role not found in Keycloak');
        return false;
      }

      const role = exactRole;

      // Remove role from user
      await this.kcAdminClient.users.delRealmRoleMappings({
        id: userId,
        roles: [
          {
            id: role.id!,
            name: role.name!,
          },
        ],
      });

      this.logger.info({ userId, roleName }, 'Role removed from user in Keycloak');
      return true;
    } catch (error) {
      this.logger.error({ error, userId, roleName }, 'Failed to remove role from user in Keycloak');
      return false;
    }
  }

  /**
   * Update user roles (replace existing roles with new ones)
   * @param userId Keycloak user ID
   * @param roleNames Array of role names to assign
   * @returns True if successful, false otherwise
   */
  async updateUserRoles(userId: string, roleNames: string[]): Promise<boolean> {
    try {
      await this.authenticate();

      // Get current roles
      const currentRoles = await this.kcAdminClient.users.listRealmRoleMappings({
        id: userId,
      });

      // Remove all current roles
      if (currentRoles.length > 0) {
        const rolesToRemove = currentRoles
          .filter((role) => role.id)
          .map((role) => ({
            id: role.id!,
            name: role.name!,
          }));

        if (rolesToRemove.length > 0) {
          await this.kcAdminClient.users.delRealmRoleMappings({
            id: userId,
            roles: rolesToRemove,
          });
        }
      }

      // Add new roles
      if (roleNames.length > 0) {
        const allRoles = await this.kcAdminClient.roles.find();

        const rolesToAdd = allRoles
          .filter((role) => roleNames.includes(role.name || '') && role.id)
          .map((role) => ({
            id: role.id!,
            name: role.name!,
          }));

        if (rolesToAdd.length > 0) {
          await this.kcAdminClient.users.addRealmRoleMappings({
            id: userId,
            roles: rolesToAdd,
          });
        }
      }

      this.logger.info({ userId, roleNames }, 'User roles updated in Keycloak');
      return true;
    } catch (error) {
      this.logger.error({ error, userId, roleNames }, 'Failed to update user roles in Keycloak');
      return false;
    }
  }

  /**
   * Check if a user has a specific role
   * @param userId Keycloak user ID
   * @param roleName Name of the role to check
   * @returns True if user has the role, false otherwise
   */
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId);
      return roles.includes(roleName);
    } catch (error) {
      this.logger.error({ error, userId, roleName }, 'Failed to check user role in Keycloak');
      return false;
    }
  }
}
