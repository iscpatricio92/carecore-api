import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { ScopePermissionService } from './scope-permission.service';
import { User } from '../interfaces/user.interface';
import { ROLES } from '../../../common/constants/roles';
import { FHIR_RESOURCE_TYPES } from '../../../common/constants/fhir-resource-types';
import { FHIR_ACTIONS } from '../../../common/constants/fhir-actions';

describe('ScopePermissionService', () => {
  let service: ScopePermissionService;

  const mockLogger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopePermissionService,
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ScopePermissionService>(ScopePermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hasPermission', () => {
    it('should return true for valid scope and resource/action', () => {
      expect(
        service.hasPermission('patient:read', FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.READ),
      ).toBe(true);
      expect(
        service.hasPermission('patient:write', FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.WRITE),
      ).toBe(true);
      expect(
        service.hasPermission('consent:share', FHIR_RESOURCE_TYPES.CONSENT, FHIR_ACTIONS.SHARE),
      ).toBe(true);
    });

    it('should return false for invalid scope', () => {
      expect(service.hasPermission('invalid:scope', FHIR_RESOURCE_TYPES.PATIENT, 'read')).toBe(
        false,
      );
    });

    it('should return false for mismatched resource', () => {
      expect(service.hasPermission('patient:read', FHIR_RESOURCE_TYPES.PRACTITIONER, 'read')).toBe(
        false,
      );
    });

    it('should return false for mismatched action', () => {
      expect(
        service.hasPermission('patient:read', FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.WRITE),
      ).toBe(false);
    });
  });

  describe('getRequiredScopes', () => {
    it('should return correct scope for patient read', () => {
      const scopes = service.getRequiredScopes(FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.READ);
      expect(scopes).toEqual(['patient:read']);
    });

    it('should return correct scope for patient write', () => {
      const scopes = service.getRequiredScopes(FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.WRITE);
      expect(scopes).toEqual(['patient:write']);
    });

    it('should return correct scope for consent share', () => {
      const scopes = service.getRequiredScopes(FHIR_RESOURCE_TYPES.CONSENT, FHIR_ACTIONS.SHARE);
      expect(scopes).toEqual(['consent:share']);
    });

    it('should return empty array for invalid resource/action', () => {
      const scopes = service.getRequiredScopes('InvalidResource', 'invalid');
      expect(scopes).toEqual([]);
    });

    it('should handle DocumentReference resource type', () => {
      const scopes = service.getRequiredScopes(FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE, 'read');
      expect(scopes).toEqual(['document:read']);
    });
  });

  describe('validateScopes', () => {
    it('should return true when user has all required scopes', () => {
      const userScopes = ['patient:read', 'patient:write', 'document:read'];
      const requiredScopes = ['patient:read'];
      expect(service.validateScopes(userScopes, requiredScopes)).toBe(true);
    });

    it('should return true when user has multiple required scopes', () => {
      const userScopes = ['patient:read', 'patient:write', 'consent:read', 'consent:share'];
      const requiredScopes = ['consent:read', 'consent:share'];
      expect(service.validateScopes(userScopes, requiredScopes)).toBe(true);
    });

    it('should return false when user is missing a required scope', () => {
      const userScopes = ['patient:read'];
      const requiredScopes = ['patient:read', 'patient:write'];
      expect(service.validateScopes(userScopes, requiredScopes)).toBe(false);
    });

    it('should return false when user has no scopes', () => {
      const userScopes: string[] = [];
      const requiredScopes = ['patient:read'];
      expect(service.validateScopes(userScopes, requiredScopes)).toBe(false);
    });

    it('should return true when no scopes are required', () => {
      const userScopes = ['patient:read'];
      const requiredScopes: string[] = [];
      expect(service.validateScopes(userScopes, requiredScopes)).toBe(true);
    });
  });

  describe('hasResourcePermission', () => {
    const mockUser: User = {
      id: 'user-123',
      keycloakUserId: 'user-123',
      username: 'testuser',
      roles: ['patient'],
      scopes: ['patient:read', 'patient:write'],
    };

    it('should return true for admin user regardless of scopes', () => {
      const adminUser: User = {
        ...mockUser,
        roles: [ROLES.ADMIN],
        scopes: [],
      };
      expect(
        service.hasResourcePermission(adminUser, FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.READ),
      ).toBe(true);
      expect(
        service.hasResourcePermission(adminUser, FHIR_RESOURCE_TYPES.CONSENT, FHIR_ACTIONS.WRITE),
      ).toBe(true);
    });

    it('should return true when user has required scope', () => {
      expect(
        service.hasResourcePermission(mockUser, FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.READ),
      ).toBe(true);
      expect(
        service.hasResourcePermission(mockUser, FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.WRITE),
      ).toBe(true);
    });

    it('should return false when user is missing required scope', () => {
      const userWithoutScopes: User = {
        ...mockUser,
        scopes: ['patient:read'],
      };
      expect(
        service.hasResourcePermission(
          userWithoutScopes,
          FHIR_RESOURCE_TYPES.PATIENT,
          FHIR_ACTIONS.WRITE,
        ),
      ).toBe(false);
    });

    it('should return false when user has no scopes', () => {
      const userWithoutScopes: User = {
        ...mockUser,
        scopes: [],
      };
      expect(
        service.hasResourcePermission(
          userWithoutScopes,
          FHIR_RESOURCE_TYPES.PATIENT,
          FHIR_ACTIONS.READ,
        ),
      ).toBe(false);
    });

    it('should return false for invalid resource/action combination', () => {
      expect(service.hasResourcePermission(mockUser, 'InvalidResource', 'read')).toBe(false);
    });
  });

  describe('getScopeForResource', () => {
    it('should generate correct scope for patient read', () => {
      expect(service.getScopeForResource(FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.READ)).toBe(
        'patient:read',
      );
    });

    it('should generate correct scope for document write', () => {
      expect(
        service.getScopeForResource(FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE, FHIR_ACTIONS.WRITE),
      ).toBe('document:write');
    });

    it('should handle consent share', () => {
      expect(service.getScopeForResource(FHIR_RESOURCE_TYPES.CONSENT, FHIR_ACTIONS.SHARE)).toBe(
        'consent:share',
      );
    });
  });

  describe('parseScope', () => {
    it('should parse valid scope correctly', () => {
      const result = service.parseScope('patient:read');
      expect(result).toEqual({
        resource: FHIR_RESOURCE_TYPES.PATIENT,
        action: 'read',
      });
    });

    it('should parse consent share scope correctly', () => {
      const result = service.parseScope('consent:share');
      expect(result).toEqual({
        resource: FHIR_RESOURCE_TYPES.CONSENT,
        action: 'share',
      });
    });

    it('should return null for invalid scope', () => {
      const result = service.parseScope('invalid:scope');
      expect(result).toBeNull();
    });
  });

  describe('getAllScopes', () => {
    it('should return all available scopes', () => {
      const scopes = service.getAllScopes();
      expect(scopes).toContain('patient:read');
      expect(scopes).toContain('patient:write');
      expect(scopes).toContain('consent:read');
      expect(scopes).toContain('consent:write');
      expect(scopes).toContain('consent:share');
      expect(scopes.length).toBeGreaterThan(0);
    });
  });

  describe('getScopesForResource', () => {
    it('should return all scopes for patient resource', () => {
      const scopes = service.getScopesForResource(FHIR_RESOURCE_TYPES.PATIENT);
      expect(scopes).toContain('patient:read');
      expect(scopes).toContain('patient:write');
    });

    it('should return all scopes for consent resource', () => {
      const scopes = service.getScopesForResource(FHIR_RESOURCE_TYPES.CONSENT);
      expect(scopes).toContain('consent:read');
      expect(scopes).toContain('consent:write');
      expect(scopes).toContain('consent:share');
    });
  });

  describe('roleGrantsPermission', () => {
    const mockUser: User = {
      id: 'user-123',
      keycloakUserId: 'user-123',
      username: 'testuser',
      roles: [],
      scopes: [],
    };

    it('should return true for admin role with any resource/action', () => {
      const adminUser: User = {
        ...mockUser,
        roles: [ROLES.ADMIN],
      };
      expect(
        service.roleGrantsPermission(adminUser, FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.READ),
      ).toBe(true);
      expect(
        service.roleGrantsPermission(adminUser, FHIR_RESOURCE_TYPES.CONSENT, FHIR_ACTIONS.WRITE),
      ).toBe(true);
    });

    it('should return true for practitioner reading encounters', () => {
      const practitionerUser: User = {
        ...mockUser,
        roles: [ROLES.PRACTITIONER],
      };
      expect(
        service.roleGrantsPermission(
          practitionerUser,
          FHIR_RESOURCE_TYPES.ENCOUNTER,
          FHIR_ACTIONS.READ,
        ),
      ).toBe(true);
    });

    it('should return true for practitioner writing encounters', () => {
      const practitionerUser: User = {
        ...mockUser,
        roles: [ROLES.PRACTITIONER],
      };
      expect(
        service.roleGrantsPermission(
          practitionerUser,
          FHIR_RESOURCE_TYPES.ENCOUNTER,
          FHIR_ACTIONS.WRITE,
        ),
      ).toBe(true);
    });

    it('should return true for practitioner reading documents', () => {
      const practitionerUser: User = {
        ...mockUser,
        roles: [ROLES.PRACTITIONER],
      };
      expect(
        service.roleGrantsPermission(
          practitionerUser,
          FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
          FHIR_ACTIONS.READ,
        ),
      ).toBe(true);
    });

    it('should return true for practitioner reading patients', () => {
      const practitionerUser: User = {
        ...mockUser,
        roles: [ROLES.PRACTITIONER],
      };
      expect(
        service.roleGrantsPermission(
          practitionerUser,
          FHIR_RESOURCE_TYPES.PATIENT,
          FHIR_ACTIONS.READ,
        ),
      ).toBe(true);
    });

    it('should return false for practitioner writing patients', () => {
      const practitionerUser: User = {
        ...mockUser,
        roles: [ROLES.PRACTITIONER],
      };
      expect(
        service.roleGrantsPermission(
          practitionerUser,
          FHIR_RESOURCE_TYPES.PATIENT,
          FHIR_ACTIONS.WRITE,
        ),
      ).toBe(false);
    });

    it('should return false for patient role', () => {
      const patientUser: User = {
        ...mockUser,
        roles: [ROLES.PATIENT],
      };
      expect(
        service.roleGrantsPermission(patientUser, FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.READ),
      ).toBe(false);
    });
  });
});
