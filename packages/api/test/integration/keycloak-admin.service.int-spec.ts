import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

// Evita cargar ESM de @keycloak/keycloak-admin-client en tests de integración
jest.mock('@keycloak/keycloak-admin-client', () => {
  return jest.fn(() => ({}));
});

import { KeycloakAdminService } from '@/modules/auth/services/keycloak-admin.service';

/**
 * Tests de integración para KeycloakAdminService
 *
 * Estos tests requieren un Keycloak en ejecución.
 * Para ejecutar estos tests:
 * 1. Asegúrate de que Keycloak esté corriendo (docker-compose up keycloak)
 * 2. Configura las variables de entorno necesarias
 * 3. Ejecuta: npm run test:integration -- keycloak-admin.service.int-spec.ts
 *
 * Si Keycloak no está disponible, estos tests se saltarán automáticamente.
 */
describe('KeycloakAdminService (integration)', () => {
  let service: KeycloakAdminService;

  // Verificar si Keycloak está disponible
  const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
  const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'carecore';
  const KEYCLOAK_ADMIN_CLIENT_ID = process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'admin-cli';
  const KEYCLOAK_ADMIN_CLIENT_SECRET = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || '';

  let keycloakAvailable = false;

  beforeAll(async () => {
    // Verificar si Keycloak está disponible
    try {
      const response = await fetch(`${KEYCLOAK_URL}/health`);
      keycloakAvailable = response.ok;
    } catch {
      keycloakAvailable = false;
      console.warn(
        'Keycloak no está disponible. Los tests de integración se saltarán.',
        'Para ejecutar estos tests, asegúrate de que Keycloak esté corriendo.',
      );
    }

    if (!keycloakAvailable) {
      return;
    }

    const configMock = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'KEYCLOAK_URL':
            return KEYCLOAK_URL;
          case 'KEYCLOAK_REALM':
            return KEYCLOAK_REALM;
          case 'KEYCLOAK_ADMIN_CLIENT_ID':
            return KEYCLOAK_ADMIN_CLIENT_ID;
          case 'KEYCLOAK_ADMIN_CLIENT_SECRET':
            return KEYCLOAK_ADMIN_CLIENT_SECRET;
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    const loggerMock = {
      setContext: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as unknown as PinoLogger;

    const moduleRef = await Test.createTestingModule({
      providers: [
        KeycloakAdminService,
        { provide: ConfigService, useValue: configMock },
        { provide: PinoLogger, useValue: loggerMock },
      ],
    }).compile();

    service = moduleRef.get<KeycloakAdminService>(KeycloakAdminService);
  });

  describe('findUserById', () => {
    it.skip('should find a user by ID (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      // Este test requiere un usuario existente en Keycloak
      const userId = 'test-user-id'; // Reemplazar con un ID real

      const result = await service.findUserById(userId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(userId);
    });
  });

  describe('getUserRoles', () => {
    it.skip('should get all roles for a user (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      const userId = 'test-user-id'; // Reemplazar con un ID real

      const roles = await service.getUserRoles(userId);

      expect(Array.isArray(roles)).toBe(true);
    });
  });

  describe('addRoleToUser', () => {
    it.skip('should add a role to a user (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      const userId = 'test-user-id';
      const roleName = 'practitioner';

      const result = await service.addRoleToUser(userId, roleName);

      expect(result).toBe(true);

      // Verificar que el rol fue agregado
      const roles = await service.getUserRoles(userId);
      expect(roles).toContain(roleName);
    });
  });

  describe('removeRoleFromUser', () => {
    it.skip('should remove a role from a user (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      const userId = 'test-user-id';
      const roleName = 'practitioner';

      // Primero agregar el rol
      await service.addRoleToUser(userId, roleName);

      // Luego removerlo
      const result = await service.removeRoleFromUser(userId, roleName);

      expect(result).toBe(true);

      // Verificar que el rol fue removido
      const roles = await service.getUserRoles(userId);
      expect(roles).not.toContain(roleName);
    });
  });

  describe('updateUserRoles', () => {
    it.skip('should update user roles by replacing existing ones (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      const userId = 'test-user-id';
      const roleNames = ['practitioner', 'practitioner-verified'];

      const result = await service.updateUserRoles(userId, roleNames);

      expect(result).toBe(true);

      // Verificar que los roles fueron actualizados
      const roles = await service.getUserRoles(userId);
      expect(roles).toEqual(expect.arrayContaining(roleNames));
    });
  });

  describe('userHasRole', () => {
    it.skip('should return true if user has the role (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      const userId = 'test-user-id';
      const roleName = 'practitioner';

      // Agregar el rol primero
      await service.addRoleToUser(userId, roleName);

      const result = await service.userHasRole(userId, roleName);

      expect(result).toBe(true);
    });
  });

  describe('findClientById', () => {
    it.skip('should find a client by client ID (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      const clientId = 'carecore-api'; // Reemplazar con un client ID real

      const result = await service.findClientById(clientId);

      expect(result).not.toBeNull();
      expect(result?.clientId).toBe(clientId);
    });
  });

  describe('validateRedirectUri', () => {
    it.skip('should return true for valid redirect URI (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      const clientId = 'carecore-api';
      const redirectUri = 'http://localhost:3000/callback';

      const result = await service.validateRedirectUri(clientId, redirectUri);

      expect(result).toBe(true);
    });
  });

  describe('userHasMFA', () => {
    it.skip('should return true if user has TOTP configured (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      const userId = 'test-user-id';

      const result = await service.userHasMFA(userId);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('generateTOTPSecret', () => {
    it.skip('should generate TOTP secret successfully (requires Keycloak)', async () => {
      if (!keycloakAvailable) {
        console.log('Skipping test: Keycloak not available');
        return;
      }

      const userId = 'test-user-id';

      const result = await service.generateTOTPSecret(userId);

      expect(result).not.toBeNull();
      expect(result?.secret).toBeDefined();
      expect(typeof result?.secret).toBe('string');
    });
  });
});
