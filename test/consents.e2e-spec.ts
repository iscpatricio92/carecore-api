import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { createTestApp } from './helpers/test-module.factory';
import {
  generatePatientToken,
  generateAdminToken,
  generateTokenWithRoles,
} from './helpers/jwt-helper';
import { FHIR_RESOURCE_TYPES } from '../src/common/constants/fhir-resource-types';

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
});
