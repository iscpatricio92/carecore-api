import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { FHIR_ACTIONS, FHIR_RESOURCE_TYPES } from '@carecore/shared';
import { ROLES } from '@/common/constants/roles';
import { ScopePermissionService } from '@/modules/auth/services/scope-permission.service';
import { User } from '@carecore/shared';

describe('ScopePermissionService (integration)', () => {
  let service: ScopePermissionService;
  let loggerMock: jest.Mocked<PinoLogger>;

  const userWithScopes = (scopes: string[], roles: string[] = []) =>
    ({
      id: 'user-1',
      roles,
      scopes,
    }) as unknown as User;

  beforeAll(async () => {
    loggerMock = {
      setContext: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ScopePermissionService,
        {
          provide: PinoLogger,
          useValue: loggerMock,
        },
      ],
    }).compile();

    service = moduleRef.get(ScopePermissionService);
  });

  it('hasPermission should match resource/action', () => {
    expect(
      service.hasPermission('patient:read', FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.READ),
    ).toBe(true);
    expect(
      service.hasPermission('patient:read', FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.WRITE),
    ).toBe(false);
  });

  it('getRequiredScopes should return mapped scope or empty', () => {
    expect(service.getRequiredScopes(FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.READ)).toEqual([
      'patient:read',
    ]);
    expect(service.getRequiredScopes('Unknown', 'read')).toEqual([]);
  });

  it('validateScopes should require all scopes', () => {
    expect(service.validateScopes(['patient:read', 'consent:write'], ['patient:read'])).toBe(true);
    expect(service.validateScopes(['patient:read'], ['patient:read', 'consent:write'])).toBe(false);
  });

  it('hasResourcePermission should grant admin all', () => {
    const admin = userWithScopes([], [ROLES.ADMIN]);
    expect(
      service.hasResourcePermission(admin, FHIR_RESOURCE_TYPES.CONSENT, FHIR_ACTIONS.WRITE),
    ).toBe(true);
  });

  it('hasResourcePermission should validate scopes when not admin', () => {
    const user = userWithScopes(['encounter:write']);
    expect(
      service.hasResourcePermission(user, FHIR_RESOURCE_TYPES.ENCOUNTER, FHIR_ACTIONS.WRITE),
    ).toBe(true);
    expect(
      service.hasResourcePermission(user, FHIR_RESOURCE_TYPES.PATIENT, FHIR_ACTIONS.WRITE),
    ).toBe(false);
  });

  it('roleGrantsPermission should allow practitioner for encounter/document write', () => {
    const practitioner = userWithScopes([], [ROLES.PRACTITIONER]);
    expect(
      service.roleGrantsPermission(practitioner, FHIR_RESOURCE_TYPES.ENCOUNTER, FHIR_ACTIONS.WRITE),
    ).toBe(true);
    expect(
      service.roleGrantsPermission(
        practitioner,
        FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
        FHIR_ACTIONS.WRITE,
      ),
    ).toBe(true);
    expect(
      service.roleGrantsPermission(practitioner, FHIR_RESOURCE_TYPES.CONSENT, FHIR_ACTIONS.WRITE),
    ).toBe(false);
  });

  it('getScopeForResource should normalize DocumentReference to document', () => {
    expect(
      service.getScopeForResource(FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE, FHIR_ACTIONS.READ),
    ).toBe('document:read');
  });

  it('parseScope returns permission or null', () => {
    expect(service.parseScope('patient:read')).toEqual({ resource: 'Patient', action: 'read' });
    expect(service.parseScope('unknown:read')).toBeNull();
  });

  it('getAllScopes returns non-empty list', () => {
    const scopes = service.getAllScopes();
    expect(scopes.length).toBeGreaterThan(0);
    expect(scopes).toContain('patient:read');
  });

  it('getScopesForResource returns only matching resource scopes', () => {
    const patientScopes = service.getScopesForResource(FHIR_RESOURCE_TYPES.PATIENT);
    expect(patientScopes.every((s) => s.startsWith('patient:'))).toBe(true);
  });
});
