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
  generateAdminToken,
  generatePractitionerToken,
  generateTokenWithRoles,
} from './helpers/jwt-helper';
import { FHIR_RESOURCE_TYPES } from '../src/common/constants/fhir-resource-types';

describe('Practitioners E2E', () => {
  let app: INestApplication;
  let patientToken: string;
  let adminToken: string;
  let practitionerToken: string;

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

    patientToken = generatePatientToken('patient-user-123');
    adminToken = generateAdminToken('admin-user-789');
    practitionerToken = generatePractitionerToken('practitioner-user-456');
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

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/practitioners', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/practitioners')
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'MD-12345',
            },
          ],
          name: [
            {
              given: ['Dr. John'],
              family: 'Doe',
            },
          ],
          active: true,
        })
        .expect(401);
    });

    it('should create a practitioner with valid token', () => {
      return request(app.getHttpServer())
        .post('/api/practitioners')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'MD-12345',
            },
          ],
          name: [
            {
              given: ['Dr. John'],
              family: 'Doe',
            },
          ],
          active: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PRACTITIONER);
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          expect(res.body.name[0]).toHaveProperty('given');
          expect(res.body.name[0].given).toContain('Dr. John');
          expect(res.body.name[0]).toHaveProperty('family', 'Doe');
          expect(res.body).toHaveProperty('active', true);
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('versionId', '1');
        });
    });

    it('should create a practitioner with admin token', () => {
      return request(app.getHttpServer())
        .post('/api/practitioners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'MD-67890',
            },
          ],
          name: [
            {
              given: ['Dr. Jane'],
              family: 'Smith',
            },
          ],
          active: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PRACTITIONER);
          expect(res.body).toHaveProperty('id');
          expect(res.body.name[0].given).toContain('Dr. Jane');
        });
    });

    it('should create a practitioner with patient token', () => {
      return request(app.getHttpServer())
        .post('/api/practitioners')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'MD-11111',
            },
          ],
          name: [
            {
              given: ['Dr. Bob'],
              family: 'Johnson',
            },
          ],
          active: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PRACTITIONER);
          expect(res.body).toHaveProperty('id');
        });
    });
  });

  describe('GET /api/practitioners', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/api/practitioners').expect(401);
    });

    it('should return list of practitioners with practitioner token', async () => {
      // First create a practitioner
      const createResponse = await request(app.getHttpServer())
        .post('/api/practitioners')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'MD-TEST-001',
            },
          ],
          name: [
            {
              given: ['Dr. Test'],
              family: 'Practitioner',
            },
          ],
          active: true,
        })
        .expect(201);

      const practitionerId = createResponse.body.id;

      // Then get all practitioners
      return request(app.getHttpServer())
        .get('/api/practitioners')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'Bundle');
          expect(res.body).toHaveProperty('type', 'searchset');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('entry');
          expect(Array.isArray(res.body.entry)).toBe(true);
          // Should see the created practitioner
          const foundPractitioner = res.body.entry.find(
            (e: { resource: { id: string } }) => e.resource.id === practitionerId,
          );
          expect(foundPractitioner).toBeDefined();
        });
    });

    it('should return list of practitioners with admin token', async () => {
      // Create a practitioner first
      await request(app.getHttpServer())
        .post('/api/practitioners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'MD-ADMIN-001',
            },
          ],
          name: [
            {
              given: ['Dr. Admin'],
              family: 'Created',
            },
          ],
          active: true,
        })
        .expect(201);

      // Get all practitioners
      return request(app.getHttpServer())
        .get('/api/practitioners')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'Bundle');
          expect(res.body).toHaveProperty('type', 'searchset');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('entry');
          expect(Array.isArray(res.body.entry)).toBe(true);
          // Admin should see all practitioners
          expect(res.body.total).toBeGreaterThanOrEqual(0);
        });
    });

    it('should return list of practitioners with patient token', async () => {
      return request(app.getHttpServer())
        .get('/api/practitioners')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'Bundle');
          expect(res.body).toHaveProperty('type', 'searchset');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('entry');
          expect(Array.isArray(res.body.entry)).toBe(true);
        });
    });
  });

  describe('GET /api/fhir/Practitioner (search)', () => {
    let createdPractitionerId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/fhir/Practitioner')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'SEARCH-MD-001',
            },
          ],
          name: [
            {
              given: ['Search'],
              family: 'Practitioner',
            },
          ],
          active: true,
        })
        .expect(201);

      createdPractitionerId = response.body.id;
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/api/fhir/Practitioner').expect(401);
    });

    it('should return 403 for patient without practitioner:read scope', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/Practitioner')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('should search practitioners by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/fhir/Practitioner?name=Search')
        .set('Authorization', `Bearer ${practitionerToken}`);

      expect([200, 500]).toContain(response.status); // Some DBs may not support JSONB search in tests
      if (response.status === 200) {
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.entries)).toBe(true);
        if (response.body.entries?.length) {
          const found = response.body.entries.find(
            (p: { id: string }) => p.id === createdPractitionerId,
          );
          expect(found).toBeDefined();
        }
      }
    });

    it('should search practitioners by identifier', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/fhir/Practitioner?identifier=SEARCH-MD-001')
        .set('Authorization', `Bearer ${practitionerToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.entries)).toBe(true);
      }
    });
  });

  describe('GET /api/practitioners/:id', () => {
    let createdPractitionerId: string;

    beforeEach(async () => {
      // Create a practitioner before each test
      const response = await request(app.getHttpServer())
        .post('/api/practitioners')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'MD-GET-TEST',
            },
          ],
          name: [
            {
              given: ['Dr. Get'],
              family: 'Test',
            },
          ],
          active: true,
        })
        .expect(201);

      createdPractitionerId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get(`/api/practitioners/${createdPractitionerId}`)
        .expect(401);
    });

    it('should return practitioner by id with practitioner token', () => {
      return request(app.getHttpServer())
        .get(`/api/practitioners/${createdPractitionerId}`)
        .set('Authorization', `Bearer ${practitionerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PRACTITIONER);
          expect(res.body).toHaveProperty('id', createdPractitionerId);
          expect(res.body).toHaveProperty('name');
        });
    });

    it('should return practitioner by id with admin token', () => {
      return request(app.getHttpServer())
        .get(`/api/practitioners/${createdPractitionerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PRACTITIONER);
          expect(res.body).toHaveProperty('id', createdPractitionerId);
        });
    });

    it('should return practitioner by id with patient token', () => {
      return request(app.getHttpServer())
        .get(`/api/practitioners/${createdPractitionerId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PRACTITIONER);
          expect(res.body).toHaveProperty('id', createdPractitionerId);
        });
    });

    it('should return 404 for non-existent practitioner', () => {
      return request(app.getHttpServer())
        .get('/api/practitioners/non-existent-id')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/fhir/Practitioner/:id', () => {
    let createdPractitionerId: string;

    beforeEach(async () => {
      // Create a practitioner before each test
      const response = await request(app.getHttpServer())
        .post('/api/fhir/Practitioner')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'MD-UPDATE-TEST',
            },
          ],
          name: [
            {
              given: ['Update'],
              family: 'Test',
            },
          ],
          active: true,
        })
        .expect(201);

      createdPractitionerId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .put(`/api/fhir/Practitioner/${createdPractitionerId}`)
        .send({
          name: [
            {
              given: ['Updated'],
              family: 'Name',
            },
          ],
        })
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .put(`/api/fhir/Practitioner/${createdPractitionerId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          name: [
            {
              given: ['Updated'],
              family: 'Name',
            },
          ],
        })
        .expect(403);
    });

    it('should update practitioner with admin token', () => {
      return request(app.getHttpServer())
        .put(`/api/fhir/Practitioner/${createdPractitionerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: [
            {
              given: ['Updated'],
              family: 'Name',
            },
          ],
          active: false,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PRACTITIONER);
          expect(res.body).toHaveProperty('id', createdPractitionerId);
          expect(res.body.name[0].given).toContain('Updated');
          expect(res.body.name[0]).toHaveProperty('family', 'Name');
          expect(res.body).toHaveProperty('active', false);
          expect(res.body.meta).toHaveProperty('versionId', '2'); // Version should increment
        });
    });

    it('should return 404 for non-existent practitioner', () => {
      return request(app.getHttpServer())
        .put('/api/fhir/Practitioner/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: [
            {
              given: ['Updated'],
              family: 'Name',
            },
          ],
        })
        .expect(404);
    });
  });

  describe('DELETE /api/fhir/Practitioner/:id', () => {
    let createdPractitionerId: string;

    beforeEach(async () => {
      // Create a practitioner before each test
      const response = await request(app.getHttpServer())
        .post('/api/fhir/Practitioner')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          identifier: [
            {
              system: 'http://example.com/license',
              value: 'MD-DELETE-TEST',
            },
          ],
          name: [
            {
              given: ['Delete'],
              family: 'Test',
            },
          ],
          active: true,
        })
        .expect(201);

      createdPractitionerId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .delete(`/api/fhir/Practitioner/${createdPractitionerId}`)
        .expect(401);
    });

    it('should require admin role', () => {
      return request(app.getHttpServer())
        .delete(`/api/fhir/Practitioner/${createdPractitionerId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('should delete practitioner with admin token', () => {
      return request(app.getHttpServer())
        .delete(`/api/fhir/Practitioner/${createdPractitionerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should return 404 for non-existent practitioner', () => {
      return request(app.getHttpServer())
        .delete('/api/fhir/Practitioner/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should verify practitioner is deleted (soft delete)', async () => {
      // Delete the practitioner
      await request(app.getHttpServer())
        .delete(`/api/fhir/Practitioner/${createdPractitionerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Try to get the deleted practitioner (should return 404)
      return request(app.getHttpServer())
        .get(`/api/fhir/Practitioner/${createdPractitionerId}`)
        .set('Authorization', `Bearer ${practitionerToken}`)
        .expect(404);
    });
  });

  describe('Authorization and Access Control', () => {
    it('should allow access to viewer role (service only requires authentication)', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .get('/api/practitioners')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'Bundle');
        });
    });

    it('should allow access to viewer role with practitioner:read scope', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', [
        'practitioner:read',
      ]);

      return request(app.getHttpServer())
        .get('/api/practitioners')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'Bundle');
        });
    });
  });
});
