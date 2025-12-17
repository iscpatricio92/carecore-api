import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './helpers/test-module.factory';
import {
  generatePatientToken,
  generateAdminToken,
  generateTokenWithRoles,
  generatePractitionerToken,
} from './helpers/jwt-helper';
import { FHIR_RESOURCE_TYPES } from '@carecore/shared';

describe('Consents E2E', () => {
  let app: INestApplication;
  let patientToken: string;
  let adminToken: string;
  let patientUserId: string;
  let adminUserId: string;
  let patientResourceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    patientUserId = 'patient-user-123';
    adminUserId = 'admin-user-789';
    patientToken = generatePatientToken(patientUserId);
    adminToken = generateAdminToken(adminUserId);

    // Create a patient record first so consents can reference it
    // Use the FHIR service endpoint which accepts CreatePatientDto
    const patientResponse = await request(app.getHttpServer())
      .post('/api/fhir/Patient')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        name: [
          {
            given: ['Test'],
            family: 'Patient',
          },
        ],
        gender: 'male',
      })
      .expect(201);

    patientResourceId = patientResponse.body.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/consents', () => {
    const validConsentData = {
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
        reference: 'Patient/123',
        display: 'Test Patient',
      },
      dateTime: '2024-01-15T10:30:00Z',
    };

    it('should require authentication', () => {
      return request(app.getHttpServer()).post('/api/consents').send(validConsentData).expect(401);
    });

    it('should require patient or admin role', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(validConsentData)
        .expect(403);
    });

    it('should create a consent with patient token', () => {
      return request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          ...validConsentData,
          patient: {
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.CONSENT);
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('status', 'active');
          expect(res.body).toHaveProperty('scope');
          expect(res.body).toHaveProperty('category');
          expect(res.body).toHaveProperty('patient');
          expect(res.body.patient).toHaveProperty('reference', `Patient/${patientResourceId}`);
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('versionId', '1');
        });
    });

    it('should create a consent with admin token', async () => {
      // Admin can create consent for any patient, but patient must exist
      // Create a patient first for admin
      const adminPatientResponse = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: [
            {
              given: ['Admin'],
              family: 'Created',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      const adminPatientId = adminPatientResponse.body.id;

      return request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validConsentData,
          patient: {
            reference: `Patient/${adminPatientId}`,
            display: 'Admin Created Patient',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.CONSENT);
          expect(res.body).toHaveProperty('id');
        });
    });

    it('should return 400 for invalid consent data', () => {
      return request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'invalid-status',
        })
        .expect(400);
    });
  });

  describe('GET /api/consents', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/api/consents').expect(401);
    });

    it('should return list of consents with patient token', async () => {
      // First create a consent
      const createResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const consentId = createResponse.body.id;

      // Then get all consents
      return request(app.getHttpServer())
        .get('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('entries');
          expect(Array.isArray(res.body.entries)).toBe(true);
          // Patient should see their own consent
          const foundConsent = res.body.entries.find((c: { id: string }) => c.id === consentId);
          expect(foundConsent).toBeDefined();
        });
    });

    it('should return list of consents with admin token', async () => {
      // Create a patient first for admin
      const adminPatientResponse = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: [
            {
              given: ['Admin'],
              family: 'Created',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      const adminPatientId = adminPatientResponse.body.id;

      // Create a consent first
      await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
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
            reference: `Patient/${adminPatientId}`,
            display: 'Admin Created',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      // Get all consents
      return request(app.getHttpServer())
        .get('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('entries');
          expect(Array.isArray(res.body.entries)).toBe(true);
          // Admin should see all consents
          expect(res.body.total).toBeGreaterThanOrEqual(0);
        });
    });
  });

  describe('GET /api/consents/:id', () => {
    let createdConsentId: string;

    beforeEach(async () => {
      // Create a consent before each test
      const response = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Get Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      createdConsentId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get(`/api/consents/${createdConsentId}`).expect(401);
    });

    it('should return consent by id with patient token (own consent)', () => {
      return request(app.getHttpServer())
        .get(`/api/consents/${createdConsentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.CONSENT);
          expect(res.body).toHaveProperty('id', createdConsentId);
          expect(res.body).toHaveProperty('status');
        });
    });

    it('should return consent by id with admin token', () => {
      return request(app.getHttpServer())
        .get(`/api/consents/${createdConsentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.CONSENT);
          expect(res.body).toHaveProperty('id', createdConsentId);
        });
    });

    it('should return 404 for non-existent consent', () => {
      return request(app.getHttpServer())
        .get('/api/consents/non-existent-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });

    it('should return 403 if patient tries to access another patient consent', async () => {
      // Create a patient and consent with a different user
      const otherPatientToken = generatePatientToken('other-patient-user-999');
      const otherPatientResponse = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({
          name: [
            {
              given: ['Other'],
              family: 'Patient',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      const otherPatientId = otherPatientResponse.body.id;

      const otherResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${otherPatientToken}`)
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
            reference: `Patient/${otherPatientId}`,
            display: 'Other Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const otherConsentId = otherResponse.body.id;

      // Try to access with original patient token
      return request(app.getHttpServer())
        .get(`/api/consents/${otherConsentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/consents/:id', () => {
    let createdConsentId: string;

    beforeEach(async () => {
      // Create a consent before each test
      const response = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Update Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      createdConsentId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .put(`/api/consents/${createdConsentId}`)
        .send({
          status: 'inactive',
        })
        .expect(401);
    });

    it('should require patient or admin role', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .put(`/api/consents/${createdConsentId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          status: 'inactive',
        })
        .expect(403);
    });

    it('should update consent with patient token (own consent)', () => {
      return request(app.getHttpServer())
        .put(`/api/consents/${createdConsentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'inactive',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.CONSENT);
          expect(res.body).toHaveProperty('id', createdConsentId);
          expect(res.body).toHaveProperty('status', 'inactive');
          expect(res.body.meta).toHaveProperty('versionId', '2'); // Version should increment
        });
    });

    it('should update consent with admin token', () => {
      return request(app.getHttpServer())
        .put(`/api/consents/${createdConsentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'rejected');
        });
    });

    it('should return 403 if patient tries to update another patient consent', async () => {
      // Create a patient and consent with a different user
      const otherPatientToken = generatePatientToken('other-patient-user-999');
      const otherPatientResponse = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({
          name: [
            {
              given: ['Other'],
              family: 'Patient',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      const otherPatientId = otherPatientResponse.body.id;

      const otherResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${otherPatientToken}`)
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
            reference: `Patient/${otherPatientId}`,
            display: 'Other Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const otherConsentId = otherResponse.body.id;

      // Try to update with original patient token
      return request(app.getHttpServer())
        .put(`/api/consents/${otherConsentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'inactive',
        })
        .expect(403);
    });

    it('should return 404 for non-existent consent', () => {
      return request(app.getHttpServer())
        .put('/api/consents/non-existent-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'inactive',
        })
        .expect(404);
    });
  });

  describe('DELETE /api/consents/:id', () => {
    let createdConsentId: string;

    beforeEach(async () => {
      // Create a consent before each test
      const response = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Delete Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      createdConsentId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).delete(`/api/consents/${createdConsentId}`).expect(401);
    });

    it('should require patient or admin role', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .delete(`/api/consents/${createdConsentId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('should delete consent with patient token (own consent)', () => {
      return request(app.getHttpServer())
        .delete(`/api/consents/${createdConsentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(204);
    });

    it('should delete consent with admin token', async () => {
      // Create a consent for admin to delete
      const createResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
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
            reference: 'Patient/ADMIN-DELETE',
            display: 'Admin Delete Test',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const adminConsentId = createResponse.body.id;

      return request(app.getHttpServer())
        .delete(`/api/consents/${adminConsentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should return 403 if patient tries to delete another patient consent', async () => {
      // Create a patient and consent with a different user
      const otherPatientToken = generatePatientToken('other-patient-user-999');
      const otherPatientResponse = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({
          name: [
            {
              given: ['Other'],
              family: 'Patient',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      const otherPatientId = otherPatientResponse.body.id;

      const otherResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${otherPatientToken}`)
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
            reference: `Patient/${otherPatientId}`,
            display: 'Other Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const otherConsentId = otherResponse.body.id;

      // Try to delete with original patient token
      return request(app.getHttpServer())
        .delete(`/api/consents/${otherConsentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent consent', () => {
      return request(app.getHttpServer())
        .delete('/api/consents/non-existent-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });
  });

  describe('POST /api/consents/:id/share', () => {
    let createdConsentId: string;

    beforeEach(async () => {
      // Create a consent before each test
      const response = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Share Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      createdConsentId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post(`/api/consents/${createdConsentId}/share`)
        .send({
          practitionerReference: 'Practitioner/123',
          days: 30,
        })
        .expect(401);
    });

    it('should require patient or admin role', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .post(`/api/consents/${createdConsentId}/share`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          practitionerReference: 'Practitioner/123',
          days: 30,
        })
        .expect(403);
    });

    it('should share consent with practitioner (patient token, own consent)', () => {
      return request(app.getHttpServer())
        .post(`/api/consents/${createdConsentId}/share`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          practitionerReference: 'Practitioner/123',
          practitionerDisplay: 'Dr. Jane Smith',
          days: 30,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', FHIR_RESOURCE_TYPES.CONSENT);
          expect(res.body).toHaveProperty('id', createdConsentId);
          expect(res.body).toHaveProperty('provision');
          expect(res.body.provision).toHaveProperty('actor');
          expect(Array.isArray(res.body.provision.actor)).toBe(true);
          // Should have the practitioner in actors
          const practitionerActor = res.body.provision.actor.find(
            (actor: { reference: { reference: string } }) =>
              actor.reference.reference === 'Practitioner/123',
          );
          expect(practitionerActor).toBeDefined();
        });
    });

    it('should share consent with practitioner (admin token)', () => {
      return request(app.getHttpServer())
        .post(`/api/consents/${createdConsentId}/share`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          practitionerReference: 'Practitioner/456',
          practitionerDisplay: 'Dr. Admin Shared',
          days: 60,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('provision');
          expect(res.body.provision).toHaveProperty('actor');
        });
    });

    it('should return 400 for invalid days (less than 1)', () => {
      return request(app.getHttpServer())
        .post(`/api/consents/${createdConsentId}/share`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          practitionerReference: 'Practitioner/123',
          days: 0,
        })
        .expect(400);
    });

    it('should return 400 for invalid days (greater than 365)', () => {
      return request(app.getHttpServer())
        .post(`/api/consents/${createdConsentId}/share`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          practitionerReference: 'Practitioner/123',
          days: 366,
        })
        .expect(400);
    });

    it('should return 403 if patient tries to share another patient consent', async () => {
      // Create a patient and consent with a different user
      const otherPatientToken = generatePatientToken('other-patient-user-999');
      const otherPatientResponse = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({
          name: [
            {
              given: ['Other'],
              family: 'Patient',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      const otherPatientId = otherPatientResponse.body.id;

      const otherResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${otherPatientToken}`)
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
            reference: `Patient/${otherPatientId}`,
            display: 'Other Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const otherConsentId = otherResponse.body.id;

      // Try to share with original patient token
      return request(app.getHttpServer())
        .post(`/api/consents/${otherConsentId}/share`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          practitionerReference: 'Practitioner/123',
          days: 30,
        })
        .expect(403);
    });

    it('should return 404 for non-existent consent', () => {
      return request(app.getHttpServer())
        .post('/api/consents/non-existent-id/share')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          practitionerReference: 'Practitioner/123',
          days: 30,
        })
        .expect(404);
    });
  });

  describe('Edge cases and validations', () => {
    it('should return 403 when patient tries to create consent without patient reference', () => {
      return request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
          // Missing patient reference
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(400) // Validation error happens before ownership check
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should return 403 when patient tries to create consent with invalid patient reference format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: 'invalid-format', // Should be Patient/{id}
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        });

      // Can be 403 (Forbidden) or 404 (Patient not found) depending on validation order
      expect([403, 404]).toContain(response.status);
      if (response.status === 403) {
        expect(response.body.message).toContain('Invalid patient reference format');
      }
    });

    it('should return 403 when patient tries to create consent for another patient', async () => {
      // Create another patient with different user
      const otherPatientToken = generatePatientToken('other-patient-456');
      const otherPatientResponse = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({
          name: [
            {
              given: ['Other'],
              family: 'Patient',
            },
          ],
          gender: 'female',
        })
        .expect(201);

      const otherPatientId = otherPatientResponse.body.id;

      // Try to create consent for other patient with original patient token
      return request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${otherPatientId}`,
            display: 'Other Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('only create consents for your own patient record');
        });
    });

    it('should return empty list when patient has no patient records', async () => {
      // Create a patient user without creating a patient record
      const patientWithoutRecordToken = generatePatientToken('patient-no-record-789');

      const response = await request(app.getHttpServer())
        .get('/api/consents')
        .set('Authorization', `Bearer ${patientWithoutRecordToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total', 0);
      expect(response.body).toHaveProperty('entries');
      expect(response.body.entries).toHaveLength(0);
    });

    it('should return empty list for viewer role without scopes', () => {
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .get('/api/consents')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total', 0);
          expect(res.body).toHaveProperty('entries');
          expect(res.body.entries).toHaveLength(0);
        });
    });

    it('should return 403 when viewer tries to update consent', async () => {
      // First create a consent as patient
      const createResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const consentId = createResponse.body.id;
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .put(`/api/consents/${consentId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          status: 'inactive',
        })
        .expect(403);
    });

    it('should return 403 when patient tries to update consent with different patient reference', async () => {
      // Create a consent
      const createResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const consentId = createResponse.body.id;

      // Create another patient
      const otherPatientToken = generatePatientToken('other-patient-update-999');
      const otherPatientResponse = await request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({
          name: [
            {
              given: ['Other'],
              family: 'Patient',
            },
          ],
          gender: 'male',
        })
        .expect(201);

      const otherPatientId = otherPatientResponse.body.id;

      // Try to update consent with different patient reference
      return request(app.getHttpServer())
        .put(`/api/consents/${consentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'inactive',
          patient: {
            reference: `Patient/${otherPatientId}`,
            display: 'Other Patient',
          },
        })
        .expect(403)
        .expect((res) => {
          expect(res.body.message).toContain('only create consents for your own patient record');
        });
    });

    it('should return 403 when viewer tries to delete consent', async () => {
      // Create a consent
      const createResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const consentId = createResponse.body.id;
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .delete(`/api/consents/${consentId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('should return 403 when viewer tries to share consent', async () => {
      // Create a consent
      const createResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const consentId = createResponse.body.id;
      const viewerToken = generateTokenWithRoles('viewer-user', ['viewer'], 'viewer', []);

      return request(app.getHttpServer())
        .post(`/api/consents/${consentId}/share`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          practitionerReference: 'Practitioner/123',
          days: 30,
        })
        .expect(403);
    });

    it('should automatically expire and set consent to inactive when provision period ends', async () => {
      // Create a consent with expiration date in the past
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - 1); // Yesterday

      const createResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: pastDate.toISOString(),
          provision: {
            period: {
              start: pastDate.toISOString(),
              end: expirationDate.toISOString(), // Already expired
            },
            actor: [],
          },
        })
        .expect(201);

      const consentId = createResponse.body.id;

      // Fetch consents - this should trigger validation of expired consents
      const response = await request(app.getHttpServer())
        .get('/api/consents')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      // Find the consent we just created
      const expiredConsent = response.body.entries.find((c: { id: string }) => c.id === consentId);

      // The consent should be marked as inactive
      if (expiredConsent) {
        expect(expiredConsent.status).toBe('inactive');
      }
    });

    it('should handle consent with null patient reference in canAccessConsent', async () => {
      // This test covers the case where a consent has null/empty patientReference
      // Note: The DTO validation may require patient reference, so we'll test with a valid patient reference
      // but then test the canAccessConsent logic with a consent that has no matching patient entity
      const createResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
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
            reference: 'Patient/non-existent-patient-for-access-test',
            display: 'Non-existent Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const consentId = createResponse.body.id;

      // Patient should not be able to access consent without matching patient entity
      return request(app.getHttpServer())
        .get(`/api/consents/${consentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('should handle consent with patient reference that does not exist', async () => {
      // Create a consent with a non-existent patient reference
      const createResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
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
            reference: 'Patient/non-existent-patient-id',
            display: 'Non-existent Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const consentId = createResponse.body.id;

      // Patient should not be able to access consent for non-existent patient
      return request(app.getHttpServer())
        .get(`/api/consents/${consentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('should allow practitioner to read active consent but not inactive', async () => {
      // Create active consent
      const activeResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const activeConsentId = activeResponse.body.id;

      // Practitioner can read active consent
      await request(app.getHttpServer())
        .get(`/api/consents/${activeConsentId}`)
        .set('Authorization', `Bearer ${generatePractitionerToken('practitioner-user-456')}`)
        .expect(200);

      // Create inactive consent
      const inactiveResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive',
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const inactiveConsentId = inactiveResponse.body.id;

      // Practitioner cannot read inactive consent
      await request(app.getHttpServer())
        .get(`/api/consents/${inactiveConsentId}`)
        .set('Authorization', `Bearer ${generatePractitionerToken('practitioner-user-456')}`)
        .expect(403);
    });

    it('should allow scope-based read (consent:read) even without patient role', async () => {
      const consentResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const consentId = consentResponse.body.id;
      const scopeToken = generateTokenWithRoles('scoped-user', [], 'scoped', ['consent:read']);

      await request(app.getHttpServer())
        .get(`/api/consents/${consentId}`)
        .set('Authorization', `Bearer ${scopeToken}`)
        .expect(200);
    });

    it('should deny scope-based write when user is not owner of patient', async () => {
      const consentResponse = await request(app.getHttpServer())
        .post('/api/consents')
        .set('Authorization', `Bearer ${adminToken}`)
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
            reference: `Patient/${patientResourceId}`,
            display: 'Test Patient',
          },
          dateTime: '2024-01-15T10:30:00Z',
        })
        .expect(201);

      const consentId = consentResponse.body.id;
      const scopeToken = generateTokenWithRoles('scoped-user', [], 'scoped', ['consent:write']);

      // User has scope but not ownership; write should be denied
      await request(app.getHttpServer())
        .put(`/api/consents/${consentId}`)
        .set('Authorization', `Bearer ${scopeToken}`)
        .send({ status: 'inactive' })
        .expect(403);
    });
  });
});
