import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { createTestApp } from './helpers/test-module.factory';
import {
  generatePatientToken,
  generateAdminToken,
  generatePractitionerToken,
} from './helpers/jwt-helper';

describe('Documents E2E', () => {
  let app: INestApplication;
  let patientToken: string;
  let adminToken: string;
  let practitionerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    patientToken = generatePatientToken();
    adminToken = generateAdminToken();
    practitionerToken = generatePractitionerToken();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/documents', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/documents')
        .send({
          status: 'current',
          content: [
            {
              attachment: {
                contentType: 'application/pdf',
                url: 'https://example.com/document.pdf',
              },
            },
          ],
          subject: { reference: 'Patient/123' },
          type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
        })
        .expect(401);
    });

    it('should create a document with valid token', () => {
      return request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'current',
          content: [
            {
              attachment: {
                contentType: 'application/pdf',
                url: 'https://example.com/document.pdf',
              },
            },
          ],
          subject: { reference: 'Patient/123' },
          type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'DocumentReference');
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('status', 'current');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('versionId', '1');
        });
    });

    it('should create a document with base64 attachment', () => {
      const base64Data = Buffer.from('test document content').toString('base64');
      return request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'current',
          content: [
            {
              attachment: {
                contentType: 'application/pdf',
                data: base64Data,
              },
            },
          ],
          subject: { reference: 'Patient/123' },
          type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'DocumentReference');
          expect(res.body.content[0].attachment).toHaveProperty('url');
          expect(res.body.content[0].attachment).toHaveProperty('size');
          expect(res.body.content[0].attachment).toHaveProperty('hash');
          expect(res.body.content[0].attachment.data).toBeUndefined();
        });
    });

    it('should reject invalid document data', () => {
      return request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'invalid-status',
        })
        .expect(400);
    });
  });

  describe('GET /api/documents', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/api/documents').expect(401);
    });

    it('should return bundle of documents with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/documents')
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

  describe('GET /api/documents/:id', () => {
    let createdDocumentId: string;

    beforeAll(async () => {
      // Create a document to test retrieval
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'current',
          content: [
            {
              attachment: {
                contentType: 'application/pdf',
                url: 'https://example.com/test-document.pdf',
              },
            },
          ],
          subject: { reference: 'Patient/123' },
          type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
        });
      createdDocumentId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get(`/api/documents/${createdDocumentId}`).expect(401);
    });

    it('should return document by id with valid token', () => {
      return request(app.getHttpServer())
        .get(`/api/documents/${createdDocumentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'DocumentReference');
          expect(res.body).toHaveProperty('id', createdDocumentId);
          expect(res.body).toHaveProperty('status', 'current');
        });
    });

    it('should return 404 for non-existent document', () => {
      return request(app.getHttpServer())
        .get('/api/documents/non-existent-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/documents/:id', () => {
    let createdDocumentId: string;

    beforeAll(async () => {
      // Create a document to test update
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'current',
          content: [
            {
              attachment: {
                contentType: 'application/pdf',
                url: 'https://example.com/test-document.pdf',
              },
            },
          ],
          subject: { reference: 'Patient/123' },
          type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
        });
      createdDocumentId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .put(`/api/documents/${createdDocumentId}`)
        .send({ status: 'superseded' })
        .expect(401);
    });

    it('should update document with valid token', () => {
      return request(app.getHttpServer())
        .put(`/api/documents/${createdDocumentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ status: 'superseded' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'DocumentReference');
          expect(res.body).toHaveProperty('id', createdDocumentId);
          expect(res.body).toHaveProperty('status', 'superseded');
          expect(res.body.meta.versionId).toBe('2');
        });
    });

    it('should return 404 for non-existent document', () => {
      return request(app.getHttpServer())
        .put('/api/documents/non-existent-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ status: 'superseded' })
        .expect(404);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    let createdDocumentId: string;

    beforeAll(async () => {
      // Create a document to test deletion
      const response = await request(app.getHttpServer())
        .post('/api/documents')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'current',
          content: [
            {
              attachment: {
                contentType: 'application/pdf',
                url: 'https://example.com/test-document.pdf',
              },
            },
          ],
          subject: { reference: 'Patient/123' },
          type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
        });
      createdDocumentId = response.body.id;
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).delete(`/api/documents/${createdDocumentId}`).expect(401);
    });

    it('should soft delete document with valid token', () => {
      return request(app.getHttpServer())
        .delete(`/api/documents/${createdDocumentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(204);
    });

    it('should return 404 when trying to delete already deleted document', () => {
      return request(app.getHttpServer())
        .delete(`/api/documents/${createdDocumentId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent document', () => {
      return request(app.getHttpServer())
        .delete('/api/documents/non-existent-id')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });
  });

  describe('Authorization', () => {
    it('should allow patient to access documents', () => {
      return request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);
    });

    it('should allow practitioner to access documents', () => {
      return request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .expect(200);
    });

    it('should allow admin to access documents', () => {
      return request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
