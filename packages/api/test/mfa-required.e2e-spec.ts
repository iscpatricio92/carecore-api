import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';

// Note: We create the test app manually to override KeycloakAdminService
import {
  generateAdminToken,
  generatePractitionerToken,
  generatePatientToken,
} from './helpers/jwt-helper';
import { KeycloakAdminService } from '../src/modules/auth/services/keycloak-admin.service';
import { AppModule } from '../src/app.module';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { MockJwtStrategy } from './helpers/mock-jwt-strategy';
import { ConfigModule } from '@nestjs/config';
import { createTestConfigModule } from './helpers/test-module.factory';

// Mock @keycloak/keycloak-admin-client before importing services
jest.mock('@keycloak/keycloak-admin-client', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    auth: jest.fn(),
    users: {
      findOne: jest.fn(),
      listRealmRoleMappings: jest.fn(),
      addRealmRoleMappings: jest.fn(),
      delRealmRoleMappings: jest.fn(),
      getCredentials: jest.fn(),
      deleteCredential: jest.fn(),
    },
    roles: {
      find: jest.fn(),
    },
  })),
}));

describe('MFA Required E2E', () => {
  let app: INestApplication;

  const mockKeycloakAdminService = {
    userHasMFA: jest.fn(),
    findUserById: jest.fn(),
    getUserRoles: jest.fn(),
    addRoleToUser: jest.fn(),
    removeRoleFromUser: jest.fn(),
    updateUserRoles: jest.fn(),
    userHasRole: jest.fn(),
    generateTOTPSecret: jest.fn(),
    verifyTOTPCode: jest.fn(),
    verifyAndEnableTOTP: jest.fn(),
    removeTOTPCredential: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(ConfigModule)
      .useModule(createTestConfigModule())
      .overrideProvider(JwtStrategy)
      .useClass(MockJwtStrategy)
      .overrideProvider(KeycloakAdminService)
      .useValue(mockKeycloakAdminService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/mfa/status', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/api/auth/mfa/status').expect(401);
    });

    it('should return MFA status for patient user', async () => {
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'patient-user-123',
        username: 'testpatient',
        email: 'patient@test.com',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['patient']);
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);

      const token = generatePatientToken('patient-user-123');

      const response = await request(app.getHttpServer())
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('mfaEnabled', false);
      expect(response.body).toHaveProperty('mfaRequired', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should return MFA status for admin user', async () => {
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'admin-user-789',
        username: 'testadmin',
        email: 'admin@test.com',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['admin']);
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

      const token = generateAdminToken('admin-user-789');

      const response = await request(app.getHttpServer())
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('mfaEnabled', true);
      expect(response.body).toHaveProperty('mfaRequired', true);
      expect(response.body.message).toContain('MFA is enabled');
    });
  });

  describe('MFA Required Guard - Admin Endpoints', () => {
    describe('GET /api/auth/verify-practitioner', () => {
      it('should allow access if admin has MFA enabled', async () => {
        mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

        const token = generateAdminToken('admin-user-789');

        await request(app.getHttpServer())
          .get('/api/auth/verify-practitioner')
          .set('Authorization', `Bearer ${token}`)
          .expect((res) => {
            // Should return 200 (empty list) or other valid status
            expect([200, 404, 500]).toContain(res.status);
          });

        expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('admin-user-789');
      });

      it('should deny access if admin does not have MFA enabled', async () => {
        mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);

        const token = generateAdminToken('admin-user-789');

        const response = await request(app.getHttpServer())
          .get('/api/auth/verify-practitioner')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        // Auth endpoints return standard JSON format
        expect(response.body).toHaveProperty('statusCode', 403);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('MFA is required');
        expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('admin-user-789');
      });
    });

    describe('POST /api/fhir/Practitioner', () => {
      it('should allow access if admin has MFA enabled', async () => {
        mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

        const token = generateAdminToken('admin-user-789');

        await request(app.getHttpServer())
          .post('/api/fhir/Practitioner')
          .set('Authorization', `Bearer ${token}`)
          .send({
            identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
            name: [{ given: ['Dr. Test'], family: 'Doctor' }],
          })
          .expect((res) => {
            // Should return 201 (created) or other valid status
            expect([201, 400, 500]).toContain(res.status);
          });

        expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('admin-user-789');
      });

      it('should deny access if admin does not have MFA enabled', async () => {
        mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);

        const token = generateAdminToken('admin-user-789');

        const response = await request(app.getHttpServer())
          .post('/api/fhir/Practitioner')
          .set('Authorization', `Bearer ${token}`)
          .send({
            identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
            name: [{ given: ['Dr. Test'], family: 'Doctor' }],
          })
          .expect(403);

        // FHIR endpoints return OperationOutcome format
        expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
        expect(response.body).toHaveProperty('issue');
        expect(response.body.issue[0]).toMatchObject({
          code: 'forbidden',
          severity: 'error',
        });
        expect(response.body.issue[0].details.text).toContain('MFA is required');
      });
    });
  });

  describe('MFA Required Guard - Practitioner Endpoints', () => {
    describe('POST /api/fhir/Encounter', () => {
      it('should allow access if practitioner has MFA enabled', async () => {
        mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

        const token = generatePractitionerToken('practitioner-user-456');

        await request(app.getHttpServer())
          .post('/api/fhir/Encounter')
          .set('Authorization', `Bearer ${token}`)
          .send({
            status: 'in-progress',
            class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
            subject: { reference: 'Patient/123' },
          })
          .expect((res) => {
            // Should return 201 (created) or other valid status
            expect([201, 400, 404, 500]).toContain(res.status);
          });

        expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('practitioner-user-456');
      });

      it('should deny access if practitioner does not have MFA enabled', async () => {
        mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);

        const token = generatePractitionerToken('practitioner-user-456');

        const response = await request(app.getHttpServer())
          .post('/api/fhir/Encounter')
          .set('Authorization', `Bearer ${token}`)
          .send({
            status: 'in-progress',
            class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
            subject: { reference: 'Patient/123' },
          })
          .expect(403);

        // FHIR endpoints return OperationOutcome format
        expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
        expect(response.body).toHaveProperty('issue');
        expect(response.body.issue[0]).toMatchObject({
          code: 'forbidden',
          severity: 'error',
        });
        expect(response.body.issue[0].details.text).toContain('MFA is required');
      });
    });
  });

  describe('MFA Not Required - Non-Critical Roles', () => {
    it('should allow patient to access their endpoints without MFA', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);

      const token = generatePatientToken('patient-user-123');

      await request(app.getHttpServer())
        .get('/api/fhir/Patient')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          // Should return 200 (empty list) or 404
          expect([200, 404]).toContain(res.status);
        });

      // MFA should not be checked for non-critical roles
      expect(mockKeycloakAdminService.userHasMFA).not.toHaveBeenCalled();
    });
  });
});
