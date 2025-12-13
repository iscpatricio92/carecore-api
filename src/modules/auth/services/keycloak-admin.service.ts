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
  private accessToken: string | null = null;
  private tokenExpiry: number = 0; // Unix timestamp in milliseconds

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
      // Check if we have a valid token
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return; // Token is still valid
      }

      await this.kcAdminClient.auth({
        grantType: 'client_credentials',
        clientId: this.adminClientId,
        clientSecret: this.adminClientSecret,
      });

      // Extract access token from the client
      // The client stores it internally, we need to get it from the token set
      const tokenSet = (
        this.kcAdminClient as unknown as {
          tokenSet?: { access_token?: string; expires_in?: number };
        }
      ).tokenSet;
      if (tokenSet?.access_token) {
        this.accessToken = tokenSet.access_token;
        // Set expiry to 5 minutes before actual expiry for safety
        const expiresIn = (tokenSet.expires_in || 60) - 5;
        this.tokenExpiry = Date.now() + expiresIn * 1000;
      }

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

  /**
   * Generate TOTP secret for a user
   * @param userId Keycloak user ID
   * @returns Object with secret, or null if failed
   */
  async generateTOTPSecret(userId: string): Promise<{ secret: string } | null> {
    try {
      await this.authenticate();

      // Check if user already has TOTP configured
      const hasMFA = await this.userHasMFA(userId);
      if (hasMFA) {
        this.logger.warn({ userId }, 'User already has TOTP configured');
        return null;
      }

      // Generate TOTP secret using Keycloak's REST API
      // Endpoint: POST /admin/realms/{realm}/users/{id}/totp/generate
      // We need to use fetch because the admin client doesn't have this method
      const token = await this.getAccessToken();
      if (!token) {
        this.logger.error({ userId }, 'Failed to get access token for TOTP generation');
        return null;
      }

      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.keycloakRealm}/users/${userId}/totp/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          { userId, status: response.status, error: errorText },
          'Failed to generate TOTP secret',
        );
        return null;
      }

      const totpData = await response.json();
      return {
        secret: totpData.secret || '',
      };
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to generate TOTP secret in Keycloak');
      return null;
    }
  }

  /**
   * Get access token for Admin API requests
   * @private
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      await this.authenticate();
      return this.accessToken;
    } catch (error) {
      this.logger.error({ error }, 'Failed to get access token');
      return null;
    }
  }

  /**
   * Check if user has MFA enabled
   * @param userId Keycloak user ID
   * @returns True if user has TOTP configured, false otherwise
   */
  async userHasMFA(userId: string): Promise<boolean> {
    try {
      await this.authenticate();

      const credentials = await this.kcAdminClient.users.getCredentials({
        id: userId,
      });

      return credentials.some((cred) => cred.type === 'otp');
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to check MFA status in Keycloak');
      return false;
    }
  }

  /**
   * Remove TOTP credential from user
   * @param userId Keycloak user ID
   * @returns True if successful, false otherwise
   */
  async removeTOTPCredential(userId: string): Promise<boolean> {
    try {
      await this.authenticate();

      const credentials = await this.kcAdminClient.users.getCredentials({
        id: userId,
      });

      const totpCredential = credentials.find((cred) => cred.type === 'otp');
      if (!totpCredential || !totpCredential.id) {
        this.logger.warn({ userId }, 'User does not have TOTP credential to remove');
        return false;
      }

      await this.kcAdminClient.users.deleteCredential({
        id: userId,
        credentialId: totpCredential.id,
      });

      this.logger.info({ userId }, 'TOTP credential removed from user');
      return true;
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to remove TOTP credential in Keycloak');
      return false;
    }
  }

  /**
   * Verify TOTP code and enable MFA for user
   * @param userId Keycloak user ID
   * @param code TOTP code to verify
   * @returns True if code is valid and MFA is enabled, false otherwise
   */
  async verifyAndEnableTOTP(userId: string, code: string): Promise<boolean> {
    try {
      await this.authenticate();

      const token = await this.getAccessToken();
      if (!token) {
        this.logger.error({ userId }, 'Failed to get access token for TOTP verification');
        return false;
      }

      // Verify TOTP code using Keycloak's REST API
      // Endpoint: POST /admin/realms/{realm}/users/{id}/totp/verify
      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.keycloakRealm}/users/${userId}/totp/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          { userId, status: response.status, error: errorText },
          'Failed to verify TOTP code',
        );
        return false;
      }

      const result = await response.json();
      const isValid = result.valid === true;

      if (isValid) {
        this.logger.info({ userId }, 'TOTP code verified and MFA enabled');
      } else {
        this.logger.warn({ userId }, 'Invalid TOTP code provided');
      }

      return isValid;
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to verify TOTP code in Keycloak');
      return false;
    }
  }

  /**
   * Verify TOTP code without enabling (for disable operation)
   * @param userId Keycloak user ID
   * @param code TOTP code to verify
   * @returns True if code is valid, false otherwise
   */
  async verifyTOTPCode(userId: string, code: string): Promise<boolean> {
    try {
      await this.authenticate();

      const token = await this.getAccessToken();
      if (!token) {
        this.logger.error({ userId }, 'Failed to get access token for TOTP verification');
        return false;
      }

      // Verify TOTP code using Keycloak's REST API
      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.keycloakRealm}/users/${userId}/totp/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          { userId, status: response.status, error: errorText },
          'Failed to verify TOTP code',
        );
        return false;
      }

      const result = await response.json();
      return result.valid === true;
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to verify TOTP code in Keycloak');
      return false;
    }
  }

  /**
   * Find a client by client ID
   * @param clientId Client ID to find
   * @returns Client representation from Keycloak, or null if not found
   */
  async findClientById(clientId: string): Promise<{
    id?: string;
    clientId?: string;
    name?: string;
    redirectUris?: string[];
    standardFlowEnabled?: boolean;
  } | null> {
    try {
      await this.authenticate();

      const clients = await this.kcAdminClient.clients.find({
        clientId: clientId,
      });

      const client = clients.find((c) => c.clientId === clientId);
      if (!client || !client.id) {
        return null;
      }

      // Get full client details including redirect URIs
      const clientDetails = await this.kcAdminClient.clients.findOne({
        id: client.id,
      });

      if (!clientDetails) {
        return null;
      }

      return {
        id: clientDetails.id,
        clientId: clientDetails.clientId,
        name: clientDetails.name,
        redirectUris: clientDetails.redirectUris || [],
        standardFlowEnabled: clientDetails.standardFlowEnabled,
      };
    } catch (error) {
      this.logger.error({ error, clientId }, 'Failed to find client in Keycloak');
      return null;
    }
  }

  /**
   * Validate that a redirect URI is registered for a client
   * @param clientId Client ID
   * @param redirectUri Redirect URI to validate
   * @returns True if redirect URI is valid for the client, false otherwise
   */
  async validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
    try {
      const client = await this.findClientById(clientId);
      if (!client) {
        return false;
      }

      const redirectUris = client.redirectUris || [];

      // Check exact match first
      if (redirectUris.includes(redirectUri)) {
        return true;
      }

      // Check wildcard patterns (e.g., https://app.com/callback/*)
      for (const registeredUri of redirectUris) {
        if (registeredUri.endsWith('/*')) {
          const baseUri = registeredUri.slice(0, -2);
          if (redirectUri.startsWith(baseUri)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      this.logger.error({ error, clientId, redirectUri }, 'Failed to validate redirect URI');
      return false;
    }
  }

  /**
   * Create a new user in Keycloak
   * @param userData User data including username, email, password, and optional attributes
   * @returns Keycloak user ID if successful, null otherwise
   */
  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    enabled?: boolean;
    emailVerified?: boolean;
  }): Promise<string | null> {
    try {
      await this.authenticate();

      const newUser = {
        username: userData.username,
        email: userData.email,
        emailVerified: userData.emailVerified ?? false,
        enabled: userData.enabled ?? true,
        firstName: userData.firstName,
        lastName: userData.lastName,
        credentials: [
          {
            type: 'password',
            value: userData.password,
            temporary: false, // User must change password on first login if true
          },
        ],
      };

      const createdUser = await this.kcAdminClient.users.create(newUser);

      // Keycloak Admin Client returns the created user with an id field
      // The id is typically in the response headers (Location header) or in the response body
      // We need to extract it from the response
      if (createdUser && typeof createdUser === 'string') {
        // If it returns a string (user ID), use it directly
        this.logger.info(
          { userId: createdUser, username: userData.username },
          'User created in Keycloak',
        );
        return createdUser;
      }

      // If it returns an object with id property
      if (createdUser && typeof createdUser === 'object' && 'id' in createdUser && createdUser.id) {
        this.logger.info(
          { userId: createdUser.id, username: userData.username },
          'User created in Keycloak',
        );
        return createdUser.id as string;
      }

      // If we can't get the ID, try to find the user by username
      try {
        const users = await this.kcAdminClient.users.find({
          username: userData.username,
          exact: true,
        });
        if (users && users.length > 0 && users[0].id) {
          this.logger.info(
            { userId: users[0].id, username: userData.username },
            'User created in Keycloak (found by username)',
          );
          return users[0].id;
        }
      } catch (findError) {
        this.logger.warn(
          { error: findError, username: userData.username },
          'Failed to find created user',
        );
      }

      this.logger.error({ username: userData.username }, 'User created but ID not found');
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { error, username: userData.username, email: userData.email },
        'Failed to create user in Keycloak',
      );

      // Check if user already exists (409 Conflict)
      if (
        errorMessage.includes('409') ||
        errorMessage.includes('exists') ||
        errorMessage.includes('duplicate')
      ) {
        throw new BadRequestException('User with this username or email already exists');
      }

      throw new BadRequestException(`Failed to create user: ${errorMessage}`);
    }
  }

  /**
   * Check if a username or email already exists in Keycloak
   * @param username Username to check
   * @param email Email to check
   * @returns Object with exists flags for username and email
   */
  async checkUserExists(
    username?: string,
    email?: string,
  ): Promise<{ usernameExists: boolean; emailExists: boolean }> {
    try {
      await this.authenticate();

      const result = { usernameExists: false, emailExists: false };

      if (username) {
        const usersByUsername = await this.kcAdminClient.users.find({ username });
        if (usersByUsername && usersByUsername.length > 0) {
          result.usernameExists = true;
        }
      }

      if (email) {
        const usersByEmail = await this.kcAdminClient.users.find({ email });
        if (usersByEmail && usersByEmail.length > 0) {
          result.emailExists = true;
        }
      }

      return result;
    } catch (error) {
      this.logger.error({ error, username, email }, 'Failed to check if user exists in Keycloak');
      // Return false on error to allow registration attempt
      return { usernameExists: false, emailExists: false };
    }
  }
}
