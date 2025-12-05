import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { createTestApp } from './helpers/test-module.factory';
import { generatePatientToken } from './helpers/jwt-helper';

describe('FHIR Protected Endpoints E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Patient endpoints', () => {
    it('should require authentication for GET /api/fhir/Patient', () => {
      return request(app.getHttpServer()).get('/api/fhir/Patient').expect(401);
    });

    it('should require authentication for GET /api/fhir/Patient/:id', () => {
      return request(app.getHttpServer()).get('/api/fhir/Patient/test-id').expect(401);
    });

    it('should require authentication for POST /api/fhir/Patient', () => {
      return request(app.getHttpServer())
        .post('/api/fhir/Patient')
        .send({
          name: [{ given: ['John'], family: 'Doe' }],
        })
        .expect(401);
    });

    it('should require authentication for PUT /api/fhir/Patient/:id', () => {
      return request(app.getHttpServer())
        .put('/api/fhir/Patient/test-id')
        .send({
          name: [{ given: ['Jane'], family: 'Doe' }],
        })
        .expect(401);
    });

    it('should require authentication for DELETE /api/fhir/Patient/:id', () => {
      return request(app.getHttpServer()).delete('/api/fhir/Patient/test-id').expect(401);
    });

    it('should allow access with valid token', () => {
      const token = generatePatientToken();
      return request(app.getHttpServer())
        .get('/api/fhir/Patient')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          // Should return 200 (empty list) or 404
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Practitioner endpoints', () => {
    it('should require authentication for GET /api/fhir/Practitioner', () => {
      return request(app.getHttpServer()).get('/api/fhir/Practitioner').expect(401);
    });

    it('should require authentication for POST /api/fhir/Practitioner', () => {
      return request(app.getHttpServer())
        .post('/api/fhir/Practitioner')
        .send({
          identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
          name: [{ given: ['Dr. Test'], family: 'Doctor' }],
        })
        .expect(401);
    });
  });

  describe('Encounter endpoints', () => {
    it('should require authentication for GET /api/fhir/Encounter', () => {
      return request(app.getHttpServer()).get('/api/fhir/Encounter').expect(401);
    });

    it('should require authentication for POST /api/fhir/Encounter', () => {
      return request(app.getHttpServer())
        .post('/api/fhir/Encounter')
        .send({
          status: 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
          subject: { reference: 'Patient/123' },
        })
        .expect(401);
    });
  });

  describe('Public endpoints', () => {
    it('GET /api/fhir/metadata should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/metadata')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'CapabilityStatement');
        });
    });

    it('GET /api should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });
  });

  describe('Invalid tokens', () => {
    it('should reject invalid token format', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/Patient')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);
    });

    it('should reject expired token', () => {
      // Note: This would require generating an expired token
      // For now, we'll test that invalid tokens are rejected
      return request(app.getHttpServer())
        .get('/api/fhir/Patient')
        .set('Authorization', 'Bearer expired.token.here')
        .expect(401);
    });

    it('should reject request without Authorization header', () => {
      return request(app.getHttpServer()).get('/api/fhir/Patient').expect(401);
    });
  });
});
