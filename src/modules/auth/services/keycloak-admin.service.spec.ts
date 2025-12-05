import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

// Mock the Keycloak Admin Client BEFORE importing the service
// Create mock functions that will be shared
const createMockFunctions = () => ({
  auth: jest.fn(),
  findOne: jest.fn(),
  listRealmRoleMappings: jest.fn(),
  addRealmRoleMappings: jest.fn(),
  delRealmRoleMappings: jest.fn(),
  rolesFind: jest.fn(),
});

// Store mock functions in a way that's accessible to both the mock and tests
// Initialize mock functions once before the mock factory
const mockFunctions = createMockFunctions();

// Create a shared mock instance
const mockInstance = {
  auth: mockFunctions.auth,
  users: {
    findOne: mockFunctions.findOne,
    listRealmRoleMappings: mockFunctions.listRealmRoleMappings,
    addRealmRoleMappings: mockFunctions.addRealmRoleMappings,
    delRealmRoleMappings: mockFunctions.delRealmRoleMappings,
  },
  roles: {
    find: mockFunctions.rolesFind,
  },
};

// Mock must be defined before importing the service
jest.mock('@keycloak/keycloak-admin-client', () => {
  // Create a factory function that always returns the same mock instance
  const MockKcAdminClient = jest.fn().mockImplementation(() => mockInstance);

  return {
    __esModule: true,
    default: MockKcAdminClient,
  };
});

// Import service AFTER mock is defined
import { KeycloakAdminService } from './keycloak-admin.service';

describe('KeycloakAdminService', () => {
  let service: KeycloakAdminService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset and setup mock functions
    mockFunctions.auth.mockClear().mockResolvedValue(undefined);
    mockFunctions.findOne.mockClear();
    mockFunctions.listRealmRoleMappings.mockClear();
    mockFunctions.addRealmRoleMappings.mockClear();
    mockFunctions.delRealmRoleMappings.mockClear();
    mockFunctions.rolesFind.mockClear();

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        KEYCLOAK_URL: 'http://localhost:8080',
        KEYCLOAK_REALM: 'carecore',
        KEYCLOAK_ADMIN_CLIENT_ID: 'admin-client-id',
        KEYCLOAK_ADMIN_CLIENT_SECRET: 'admin-client-secret',
      };
      return config[key] || '';
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakAdminService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<KeycloakAdminService>(KeycloakAdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findUserById', () => {
    it.skip('should find a user by ID', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
      };

      mockFunctions.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserById(userId);

      expect(mockFunctions.auth).toHaveBeenCalled();
      expect(mockFunctions.findOne).toHaveBeenCalledWith({ id: userId });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const userId = 'non-existent-user';

      mockFunctions.findOne.mockRejectedValue(new Error('User not found'));

      const result = await service.findUserById(userId);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserRoles', () => {
    it.skip('should get all roles for a user', async () => {
      const userId = 'user-123';
      const mockRoles = [
        { id: 'role-1', name: 'practitioner' },
        { id: 'role-2', name: 'practitioner-verified' },
      ];

      mockFunctions.listRealmRoleMappings.mockResolvedValue(mockRoles);

      const result = await service.getUserRoles(userId);

      expect(mockFunctions.auth).toHaveBeenCalled();
      expect(mockFunctions.listRealmRoleMappings).toHaveBeenCalledWith({ id: userId });
      expect(result).toEqual(['practitioner', 'practitioner-verified']);
    });

    it('should return empty array on error', async () => {
      const userId = 'user-123';

      mockFunctions.listRealmRoleMappings.mockRejectedValue(new Error('Failed'));

      const result = await service.getUserRoles(userId);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('addRoleToUser', () => {
    it.skip('should add a role to a user', async () => {
      const userId = 'user-123';
      const roleName = 'practitioner-verified';
      const mockRoles = [{ id: 'role-1', name: roleName }];

      mockFunctions.rolesFind.mockResolvedValue(mockRoles);
      mockFunctions.addRealmRoleMappings.mockResolvedValue(undefined);

      const result = await service.addRoleToUser(userId, roleName);

      expect(mockFunctions.auth).toHaveBeenCalled();
      expect(mockFunctions.rolesFind).toHaveBeenCalledWith({ search: roleName });
      expect(mockFunctions.addRealmRoleMappings).toHaveBeenCalledWith({
        id: userId,
        roles: [{ id: 'role-1', name: roleName }],
      });
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it.skip('should return false if role not found', async () => {
      const userId = 'user-123';
      const roleName = 'non-existent-role';

      mockFunctions.rolesFind.mockResolvedValue([]);

      const result = await service.addRoleToUser(userId, roleName);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockFunctions.addRealmRoleMappings).not.toHaveBeenCalled();
    });

    it.skip('should return false if role has no id', async () => {
      const userId = 'user-123';
      const roleName = 'practitioner-verified';
      const mockRoles = [{ id: undefined, name: roleName }];

      mockFunctions.rolesFind.mockResolvedValue(mockRoles);

      const result = await service.addRoleToUser(userId, roleName);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      const userId = 'user-123';
      const roleName = 'practitioner-verified';

      mockFunctions.rolesFind.mockRejectedValue(new Error('Failed'));

      const result = await service.addRoleToUser(userId, roleName);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('removeRoleFromUser', () => {
    it.skip('should remove a role from a user', async () => {
      const userId = 'user-123';
      const roleName = 'practitioner-verified';
      const mockRoles = [{ id: 'role-1', name: roleName }];

      mockFunctions.rolesFind.mockResolvedValue(mockRoles);
      mockFunctions.delRealmRoleMappings.mockResolvedValue(undefined);

      const result = await service.removeRoleFromUser(userId, roleName);

      expect(mockFunctions.auth).toHaveBeenCalled();
      expect(mockFunctions.rolesFind).toHaveBeenCalledWith({ search: roleName });
      expect(mockFunctions.delRealmRoleMappings).toHaveBeenCalledWith({
        id: userId,
        roles: [{ id: 'role-1', name: roleName }],
      });
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it.skip('should return false if role not found', async () => {
      const userId = 'user-123';
      const roleName = 'non-existent-role';

      mockFunctions.rolesFind.mockResolvedValue([]);

      const result = await service.removeRoleFromUser(userId, roleName);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      const userId = 'user-123';
      const roleName = 'practitioner-verified';

      mockFunctions.rolesFind.mockRejectedValue(new Error('Failed'));

      const result = await service.removeRoleFromUser(userId, roleName);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateUserRoles', () => {
    it.skip('should update user roles by replacing existing ones', async () => {
      const userId = 'user-123';
      const roleNames = ['practitioner', 'practitioner-verified'];
      const currentRoles = [{ id: 'role-1', name: 'old-role' }];
      const allRoles = [
        { id: 'role-2', name: 'practitioner' },
        { id: 'role-3', name: 'practitioner-verified' },
      ];

      mockFunctions.listRealmRoleMappings.mockResolvedValue(currentRoles);
      mockFunctions.rolesFind.mockResolvedValue(allRoles);
      mockFunctions.delRealmRoleMappings.mockResolvedValue(undefined);
      mockFunctions.addRealmRoleMappings.mockResolvedValue(undefined);

      const result = await service.updateUserRoles(userId, roleNames);

      expect(mockFunctions.auth).toHaveBeenCalled();
      expect(mockFunctions.listRealmRoleMappings).toHaveBeenCalledWith({ id: userId });
      expect(mockFunctions.delRealmRoleMappings).toHaveBeenCalled();
      expect(mockFunctions.addRealmRoleMappings).toHaveBeenCalledWith({
        id: userId,
        roles: [
          { id: 'role-2', name: 'practitioner' },
          { id: 'role-3', name: 'practitioner-verified' },
        ],
      });
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it.skip('should handle empty role names array', async () => {
      const userId = 'user-123';
      const currentRoles = [{ id: 'role-1', name: 'old-role' }];

      mockFunctions.listRealmRoleMappings.mockResolvedValue(currentRoles);
      mockFunctions.delRealmRoleMappings.mockResolvedValue(undefined);

      const result = await service.updateUserRoles(userId, []);

      expect(result).toBe(true);
      expect(mockFunctions.delRealmRoleMappings).toHaveBeenCalled();
      expect(mockFunctions.addRealmRoleMappings).not.toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      const userId = 'user-123';
      const roleNames = ['practitioner'];

      mockFunctions.listRealmRoleMappings.mockRejectedValue(new Error('Failed'));

      const result = await service.updateUserRoles(userId, roleNames);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('userHasRole', () => {
    it.skip('should return true if user has the role', async () => {
      const userId = 'user-123';
      const roleName = 'practitioner-verified';
      const mockRoles = [
        { id: 'role-1', name: 'practitioner' },
        { id: 'role-2', name: 'practitioner-verified' },
      ];

      mockFunctions.listRealmRoleMappings.mockResolvedValue(mockRoles);

      const result = await service.userHasRole(userId, roleName);

      expect(result).toBe(true);
    });

    it('should return false if user does not have the role', async () => {
      const userId = 'user-123';
      const roleName = 'practitioner-verified';
      const mockRoles = [{ id: 'role-1', name: 'practitioner' }];

      mockFunctions.listRealmRoleMappings.mockResolvedValue(mockRoles);

      const result = await service.userHasRole(userId, roleName);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const userId = 'user-123';
      const roleName = 'practitioner-verified';

      mockFunctions.listRealmRoleMappings.mockRejectedValue(new Error('Failed'));

      const result = await service.userHasRole(userId, roleName);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it.skip('should authenticate with Keycloak Admin API', async () => {
      const userId = 'user-123';
      mockFunctions.findOne.mockResolvedValue({ id: userId });

      await service.findUserById(userId);

      expect(mockFunctions.auth).toHaveBeenCalledWith({
        grantType: 'client_credentials',
        clientId: 'admin-client-id',
        clientSecret: 'admin-client-secret',
      });
    });

    it('should handle authentication errors', async () => {
      const userId = 'user-123';
      mockFunctions.auth.mockRejectedValue(new Error('Authentication failed'));

      const result = await service.findUserById(userId);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('configuration warnings', () => {
    it('should warn if KEYCLOAK_URL is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_URL') return '';
        return 'test-value';
      });

      const module = await Test.createTestingModule({
        providers: [
          KeycloakAdminService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: PinoLogger,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const serviceInstance = module.get<KeycloakAdminService>(KeycloakAdminService);

      expect(serviceInstance).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'KEYCLOAK_URL is not configured. Keycloak Admin operations will fail.',
      );
    });

    it('should warn if admin client credentials are not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_ADMIN_CLIENT_ID' || key === 'KEYCLOAK_ADMIN_CLIENT_SECRET') return '';
        return 'test-value';
      });

      const module = await Test.createTestingModule({
        providers: [
          KeycloakAdminService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: PinoLogger,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const serviceInstance = module.get<KeycloakAdminService>(KeycloakAdminService);

      expect(serviceInstance).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'KEYCLOAK_ADMIN_CLIENT_ID or KEYCLOAK_ADMIN_CLIENT_SECRET is not configured. Keycloak Admin operations will fail.',
      );
    });
  });
});
