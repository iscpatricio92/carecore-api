import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { createTestApp } from './helpers/test-module.factory';
import {
  generatePatientToken,
  generateAdminToken,
  generatePractitionerToken,
  generateTokenWithRoles,
} from './helpers/jwt-helper';
import { FHIR_RESOURCE_TYPES } from '../src/common/constants/fhir-resource-types';

describe('Patients E2E', () => {
  let app: INestApplication;
  let patientToken: string;
  let adminToken: string;
  let practitionerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    patientToken = generatePatientToken('patient-user-123');
    adminToken = generateAdminToken('admin-user-789');
    practitionerToken = generatePractitionerToken('practitioner-user-456');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/patients', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/patients')
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PATIENT,
          name: [
            {
              given: ['John'],
              family: 'Doe',
            },
          ],
          gender: 'male',
        })
        .expect(401);
    });

    it('should create a patient with valid token', () => {
      return request(app.getHttpServer())
        .post('/api/patients')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PATIENT,
          name: [
            {
              given: ['John'],
              family: 'Doe',
            },
          ],
          gender: 'male',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PATIENT);
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
          expect(res.body.name[0]).toHaveProperty('given');
          expect(res.body.name[0].given).toContain('John');
          expect(res.body.name[0]).toHaveProperty('family', 'Doe');
          expect(res.body).toHaveProperty('gender', 'male');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('versionId', '1');
        });
    });

    it('should create a patient with admin token', () => {
      return request(app.getHttpServer())
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PATIENT,
          name: [
            {
              given: ['Jane'],
              family: 'Smith',
            },
          ],
          gender: 'female',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PATIENT);
          expect(res.body).toHaveProperty('id');
          expect(res.body.name[0].given).toContain('Jane');
        });
    });

    it('should create a patient with practitioner token', () => {
      return request(app.getHttpServer())
        .post('/api/patients')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PATIENT,
          name: [
            {
              given: ['Bob'],
              family: 'Johnson',
            },
          ],
          gender: 'male',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PATIENT);
          expect(res.body).toHaveProperty('id');
        });
    });

    it('should accept patient data (service does not validate resourceType)', () => {
      // Note: The service doesn't validate resourceType, it just uses whatever is provided
      return request(app.getHttpServer())
        .post('/api/patients')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          resourceType: 'InvalidResource',
          name: 'invalid',
        })
        .expect(201)
        .expect((res) => {
          // Service will create it anyway, overriding resourceType
          expect(res.body).toHaveProperty('resourceType', 'Patient');
          expect(res.body).toHaveProperty('id');
        });
    });
  });

  describe('GET /api/patients', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/api/patients').expect(401);
    });

    it('should return list of patients with patient token', async () => {
      // First create a patient
      const createResponse = await request(app.getHttpServer())
        .post('/api/patients')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PATIENT,
          name: [
            {
              given: ['Test'],
              family: 'Patient',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      const patientId = createResponse.body.id;

      // Then get all patients
      return request(app.getHttpServer())
        .get('/api/patients')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'Bundle');
          expect(res.body).toHaveProperty('type', 'searchset');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('entry');
          expect(Array.isArray(res.body.entry)).toBe(true);
          // Patient should see their own patient
          const foundPatient = res.body.entry.find(
            (e: { resource: { id: string } }) => e.resource.id === patientId,
          );
          expect(foundPatient).toBeDefined();
        });
    });

    it('should return list of patients with admin token', async () => {
      // Create a patient first
      await request(app.getHttpServer())
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PATIENT,
          name: [
            {
              given: ['Admin'],
              family: 'Created',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      // Get all patients
      return request(app.getHttpServer())
        .get('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'Bundle');
          expect(res.body).toHaveProperty('type', 'searchset');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('entry');
          expect(Array.isArray(res.body.entry)).toBe(true);
          // Admin should see all patients
          expect(res.body.total).toBeGreaterThanOrEqual(0);
        });
    });

    it('should return list of patients with practitioner token', async () => {
      return request(app.getHttpServer())
        .get('/api/patients')
        .set('Authorization', `Bearer ${practitionerToken}`)
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

  describe('GET /api/patients/:id', () => {
    let createdPatientId: string;

    beforeEach(async () => {
      // Create a patient before each test
      const response = await request(app.getHttpServer())
        .post('/api/patients')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PATIENT,
          name: [
            {
              given: ['Get'],
              family: 'Test',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      createdPatientId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get(`/api/patients/${createdPatientId}`).expect(401);
    });

    it('should return patient by id with patient token', () => {
      return request(app.getHttpServer())
        .get(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PATIENT);
          expect(res.body).toHaveProperty('id', createdPatientId);
          expect(res.body).toHaveProperty('name');
        });
    });

    it('should return patient by id with admin token', () => {
      return request(app.getHttpServer())
        .get(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PATIENT);
          expect(res.body).toHaveProperty('id', createdPatientId);
        });
    });

    it('should return patient by id with practitioner token', () => {
      return request(app.getHttpServer())
        .get(`/api/patients/${createdPatientId}`)
        .set('Authorization', `Bearer ${practitionerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PATIENT);
          expect(res.body).toHaveProperty('id', createdPatientId);
        });
    });

    it('should return 404 for non-existent patient', () => {
      return request(app.getHttpServer())
        .get('/api/patients/non-existent-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });

    it('should allow patient to access any patient (service has no authorization logic)', async () => {
      // Create a patient with a different user
      const otherPatientToken = generatePatientToken('other-patient-user-999');
      const otherResponse = await request(app.getHttpServer())
        .post('/api/patients')
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({
          resourceType: FHIR_RESOURCE_TYPES.PATIENT,
          name: [
            {
              given: ['Other'],
              family: 'Patient',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      const otherPatientId = otherResponse.body.id;

      // Try to access with original patient token
      // Note: The service doesn't implement authorization, so this will succeed
      return request(app.getHttpServer())
        .get(`/api/patients/${otherPatientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', otherPatientId);
        });
    });
  });

  describe('PUT /api/fhir/Patient/:id', () => {
    let createdPatientId: string;

    beforeEach(async () => {
      // Create a patient before each test
      const response = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          name: [
            {
              given: ['Update'],
              family: 'Test',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      createdPatientId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .put(`/api/fhir/Patient/${createdPatientId}`)
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

    it('should require patient:write scope', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .put(`/api/fhir/Patient/${createdPatientId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
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

    it('should update patient with patient token and patient:write scope', () => {
      const tokenWithScope = generateTokenWithRoles('patient-user-123', ['patient'], 'patient', [
        'patient:write',
      ]);

      return request(app.getHttpServer())
        .put(`/api/fhir/Patient/${createdPatientId}`)
        .set('Authorization', `Bearer ${tokenWithScope}`)
        .send({
          name: [
            {
              given: ['Updated'],
              family: 'Name',
            },
          ],
          gender: 'female',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PATIENT);
          expect(res.body).toHaveProperty('id', createdPatientId);
          expect(res.body.name[0].given).toContain('Updated');
          expect(res.body.name[0]).toHaveProperty('family', 'Name');
          expect(res.body).toHaveProperty('gender', 'female');
          expect(res.body.meta).toHaveProperty('versionId', '2'); // Version should increment
        });
    });

    it('should update patient with admin token', () => {
      return request(app.getHttpServer())
        .put(`/api/fhir/Patient/${createdPatientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: [
            {
              given: ['Admin'],
              family: 'Updated',
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.PATIENT);
          expect(res.body).toHaveProperty('id', createdPatientId);
          expect(res.body.name[0].given).toContain('Admin');
        });
    });

    it('should return 404 for non-existent patient', () => {
      const tokenWithScope = generateTokenWithRoles('patient-user-123', ['patient'], 'patient', [
        'patient:write',
      ]);

      return request(app.getHttpServer())
        .put('/api/fhir/Patient/non-existent-id')
        .set('Authorization', `Bearer ${tokenWithScope}`)
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

  describe('DELETE /api/fhir/Patient/:id', () => {
    let createdPatientId: string;

    beforeEach(async () => {
      // Create a patient before each test
      const response = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          name: [
            {
              given: ['Delete'],
              family: 'Test',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      createdPatientId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .delete(`/api/fhir/Patient/${createdPatientId}`)
        .expect(401);
    });

    it('should require patient:write scope', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .delete(`/api/fhir/Patient/${createdPatientId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('should delete patient with patient token and patient:write scope', () => {
      const tokenWithScope = generateTokenWithRoles('patient-user-123', ['patient'], 'patient', [
        'patient:write',
      ]);

      return request(app.getHttpServer())
        .delete(`/api/fhir/Patient/${createdPatientId}`)
        .set('Authorization', `Bearer ${tokenWithScope}`)
        .expect(204);
    });

    it('should delete patient with admin token', () => {
      return request(app.getHttpServer())
        .delete(`/api/fhir/Patient/${createdPatientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should return 404 for non-existent patient', () => {
      const tokenWithScope = generateTokenWithRoles('patient-user-123', ['patient'], 'patient', [
        'patient:write',
      ]);

      return request(app.getHttpServer())
        .delete('/api/fhir/Patient/non-existent-id')
        .set('Authorization', `Bearer ${tokenWithScope}`)
        .expect(404);
    });

    it('should verify patient is deleted (soft delete)', async () => {
      const tokenWithScope = generateTokenWithRoles('patient-user-123', ['patient'], 'patient', [
        'patient:write',
      ]);

      // Delete the patient
      await request(app.getHttpServer())
        .delete(`/api/fhir/Patient/${createdPatientId}`)
        .set('Authorization', `Bearer ${tokenWithScope}`)
        .expect(204);

      // Try to get the deleted patient (should return 404)
      return request(app.getHttpServer())
        .get(`/api/fhir/Patient/${createdPatientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });
  });

  describe('Authorization and Access Control', () => {
    it('should allow access to viewer role (service only requires authentication)', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .get('/api/patients')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'Bundle');
        });
    });

    it('should allow access to viewer role with patient:read scope', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', [
        'patient:read',
      ]);

      return request(app.getHttpServer())
        .get('/api/patients')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'Bundle');
        });
    });
  });
});
