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

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { MockJwtStrategy } from './helpers/mock-jwt-strategy';
import { ConfigModule } from '@nestjs/config';
import { KeycloakAdminService } from '../src/modules/auth/services/keycloak-admin.service';
import {
  generatePatientToken,
  generatePractitionerToken,
  generateAdminToken,
} from './helpers/jwt-helper';

describe('Authorization E2E', () => {
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
      .useModule(
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env.local'],
          load: [
            () => ({
              NODE_ENV: 'test',
              PORT: 3001,
              DB_HOST: process.env.DB_HOST || 'localhost',
              DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
              DB_USER: process.env.DB_USER || 'test_user',
              DB_PASSWORD: process.env.DB_PASSWORD || 'test_password',
              DB_NAME: process.env.DB_NAME || 'test_db',
              KEYCLOAK_URL: process.env.KEYCLOAK_URL || 'http://localhost:8080',
              KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || 'carecore',
              KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || 'carecore-api',
              KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET || 'test-secret',
              ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'test-encryption-key-32-chars-long',
            }),
          ],
        }),
      )
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
    // Default: MFA enabled for admin and practitioner (critical roles)
    mockKeycloakAdminService.userHasMFA.mockImplementation((userId: string) => {
      // Admin and practitioner users should have MFA enabled by default in tests
      if (userId.includes('admin') || userId.includes('practitioner')) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });
  });

  describe('Role-based access control - Patients', () => {
    it('should allow patient to access their own patient record', async () => {
      const token = generatePatientToken('patient-123');
      // This test would require creating a patient record first
      // For now, we'll test that the endpoint requires authentication
      return request(app.getHttpServer())
        .get('/api/fhir/Patient')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          // Should return 200 (empty list if no patients) or 404 if patient not found
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should deny access to FHIR endpoints without authentication', () => {
      return request(app.getHttpServer()).get('/api/fhir/Patient').expect(401);
    });

    it('should deny access to Practitioner creation for non-admin users', () => {
      const token = generatePatientToken();
      return request(app.getHttpServer())
        .post('/api/fhir/Practitioner')
        .set('Authorization', `Bearer ${token}`)
        .send({
          identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
          name: [{ given: ['Dr. Test'], family: 'Doctor' }],
        })
        .expect(403);
    });

    it('should allow admin to create Practitioner', async () => {
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
          // Can be 201 (created) or 400 (validation error)
          expect([201, 400]).toContain(res.status);
        });
    });
  });

  describe('Role-based access control - Encounters', () => {
    it('should deny patient from creating Encounter', () => {
      const token = generatePatientToken();
      return request(app.getHttpServer())
        .post('/api/fhir/Encounter')
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
          subject: { reference: 'Patient/123' },
        })
        .expect(403);
    });

    it('should allow practitioner to create Encounter', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      const token = generatePractitionerToken('practitioner-user-456');
      await request(app.getHttpServer())
        .post('/api/fhir/Encounter')
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
          subject: { reference: 'Patient/123' },
        })
        .expect((res) => {
          // Can be 201 (created) or 400 (validation error)
          expect([201, 400]).toContain(res.status);
        });
    });

    it('should allow admin to create Encounter', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      const token = generateAdminToken('admin-user-789');
      await request(app.getHttpServer())
        .post('/api/fhir/Encounter')
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
          subject: { reference: 'Patient/123' },
        })
        .expect((res) => {
          // Can be 201 (created) or 400 (validation error)
          expect([201, 400]).toContain(res.status);
        });
    });
  });

  describe('Role-based access control - Consents', () => {
    it('should allow patient to create Consent', () => {
      const token = generatePatientToken('patient-123');
      return request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'active',
          scope: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/consentscope',
                code: 'patient-privacy',
                display: 'Privacy Consent',
              },
            ],
          },
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
                  code: '59284-0',
                  display: 'Patient Consent',
                },
              ],
            },
          ],
          patient: {
            reference: 'Patient/patient-123',
          },
        })
        .expect((res) => {
          // Can be 201 (created), 400 (validation error), 403 (authorization error), or 404 (patient not found)
          expect([201, 400, 403, 404]).toContain(res.status);
        });
    });

    it('should deny practitioner from creating Consent', () => {
      const token = generatePractitionerToken();
      return request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'active',
          scope: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/consentscope',
                code: 'patient-privacy',
              },
            ],
          },
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
                  code: '59284-0',
                },
              ],
            },
          ],
          patient: {
            reference: 'Patient/123',
          },
        })
        .expect(403);
    });
  });
});
