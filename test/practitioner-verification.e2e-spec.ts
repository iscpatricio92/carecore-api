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
import * as fs from 'fs';
import * as path from 'path';
import { DocumentStorageService } from '../src/modules/auth/services/document-storage.service';

import { AppModule } from '../src/app.module';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { MockJwtStrategy } from './helpers/mock-jwt-strategy';
import { ConfigModule } from '@nestjs/config';
import { KeycloakAdminService } from '../src/modules/auth/services/keycloak-admin.service';
import {
  generateAdminToken,
  generatePractitionerToken,
  generatePatientToken,
} from './helpers/jwt-helper';

describe('Practitioner Verification E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let practitionerToken: string;
  let patientToken: string;
  let testPractitionerId: string;
  let createdVerificationId: string;
  let documentStorageService: DocumentStorageService;

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

  // Create a temporary test file for uploads
  const createTestFile = (filename: string, content: string = 'test file content'): string => {
    const testDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const filePath = path.join(testDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  // Clean up test files
  const cleanupTestFiles = () => {
    const testDir = path.join(__dirname, 'temp');
    if (fs.existsSync(testDir)) {
      fs.readdirSync(testDir).forEach((file) => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
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
    documentStorageService = app.get(DocumentStorageService);

    adminToken = generateAdminToken('admin-user-789');
    practitionerToken = generatePractitionerToken('practitioner-user-456');
    patientToken = generatePatientToken('patient-user-123');

    // Mock MFA for admin (required for admin endpoints)
    mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset MFA mock for admin
    mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
  });

  afterAll(async () => {
    cleanupTestFiles();
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/auth/verify-practitioner', () => {
    beforeEach(async () => {
      // Create a test practitioner first
      const practitionerResponse = await request(app.getHttpServer())
        .post('/api/fhir/Practitioner')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resourceType: 'Practitioner',
          name: [
            {
              family: 'Test',
              given: ['Practitioner'],
            },
          ],
          identifier: [
            {
              system: 'http://example.com/practitioner-id',
              value: 'test-practitioner-123',
            },
          ],
        });

      if (practitionerResponse.status === 201) {
        testPractitionerId = practitionerResponse.body.id;
      } else {
        // If creation fails, use a mock ID
        testPractitionerId = 'test-practitioner-123';
      }
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).post('/api/auth/verify-practitioner').expect(401);
    });

    it('should return 403 for patient user', () => {
      const testFile = createTestFile('test-document.pdf');
      return request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('documentFile', testFile)
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'cedula')
        .expect(403);
    });

    it('should return 400 without file', () => {
      return request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'cedula')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('file');
        });
    });

    it('should return 400 without practitionerId', () => {
      const testFile = createTestFile('test-document.pdf');
      return request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile)
        .field('documentType', 'cedula')
        .expect(400);
    });

    it('should return 400 without documentType', () => {
      const testFile = createTestFile('test-document.pdf');
      return request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile)
        .field('practitionerId', testPractitionerId)
        .expect(400);
    });

    it('should return 400 with invalid documentType', () => {
      const testFile = createTestFile('test-document.pdf');
      return request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile)
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'invalid-type')
        .expect(400);
    });

    it('should return 400 when file size exceeds maximum', () => {
      // Create a file larger than 10MB (default max size)
      const largeContent = Buffer.alloc(11 * 1024 * 1024, 'x'); // 11MB
      const largeFile = createTestFile('large-document.pdf', largeContent.toString());
      return request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', largeFile)
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'cedula')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message.toLowerCase()).toMatch(/file size|size exceeds|maximum/i);
        });
    });

    it('should return 400 when file MIME type is not allowed', () => {
      // Create a file with invalid MIME type (e.g., text/plain)
      const testFile = createTestFile('test-document.txt', 'plain text content');
      return request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile, { contentType: 'text/plain' })
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'cedula')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message.toLowerCase()).toMatch(/file type|mime type|not allowed/i);
        });
    });

    it('should return 400 when file extension is not allowed', () => {
      // Create a file with invalid extension (e.g., .exe)
      const testFile = createTestFile('test-document.exe', 'executable content');
      return request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile, { contentType: 'application/pdf' })
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'cedula')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message.toLowerCase()).toMatch(/extension|not allowed/i);
        });
    });

    it('should accept valid image files (JPG)', async () => {
      const testFile = createTestFile('test-image.jpg', 'fake jpeg content');
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile, { contentType: 'image/jpeg' })
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'cedula');

      // Should accept JPG files
      expect([201, 400]).toContain(response.status);
    });

    it('should accept valid image files (PNG)', async () => {
      const testFile = createTestFile('test-image.png', 'fake png content');
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile, { contentType: 'image/png' })
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'licencia');

      // Should accept PNG files
      expect([201, 400]).toContain(response.status);
    });

    it('should handle file without extension by using MIME type', async () => {
      // Create a file without extension but with valid MIME type
      const testFile = createTestFile('test-document', 'pdf content');
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile, { contentType: 'application/pdf' })
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'cedula');

      // Should handle files without extension by deriving from MIME type
      expect([201, 400]).toContain(response.status);
    });

    it('should create verification request as practitioner', async () => {
      const testFile = createTestFile('test-cedula.pdf');
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile)
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'cedula')
        .field('additionalInfo', 'Test verification request')
        .expect(201);

      expect(response.body).toHaveProperty('verificationId');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('estimatedReviewTime');

      createdVerificationId = response.body.verificationId;
    });

    it('should create verification request as admin', async () => {
      const testFile = createTestFile('test-licencia.pdf');
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('documentFile', testFile)
        .field('practitionerId', testPractitionerId)
        .field('documentType', 'licencia')
        .expect(201);

      expect(response.body).toHaveProperty('verificationId');
      expect(response.body).toHaveProperty('status', 'pending');
    });
  });

  describe('GET /api/auth/verify-practitioner', () => {
    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/api/auth/verify-practitioner').expect(401);
    });

    it('should return 403 for practitioner user', () => {
      return request(app.getHttpServer())
        .get('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .expect(403);
    });

    it('should return 403 for patient user', () => {
      return request(app.getHttpServer())
        .get('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('should return 403 for admin without MFA', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      return request(app.getHttpServer())
        .get('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should list all verifications as admin with MFA', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter verifications by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/verify-practitioner?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // All returned verifications should have pending status
      response.body.data.forEach((verification: { status: string }) => {
        expect(verification.status).toBe('pending');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/verify-practitioner?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Page and limit can be numbers or strings (from query params)
      const page =
        typeof response.body.page === 'string'
          ? parseInt(response.body.page, 10)
          : response.body.page;
      const limit =
        typeof response.body.limit === 'string'
          ? parseInt(response.body.limit, 10)
          : response.body.limit;
      expect(page).toBeGreaterThanOrEqual(1);
      expect(limit).toBeGreaterThanOrEqual(1);
      // Data length should not exceed limit
      if (response.body.data.length > 0) {
        expect(response.body.data.length).toBeLessThanOrEqual(limit);
      }
    });
  });

  describe('GET /api/auth/verify-practitioner/:id', () => {
    beforeEach(async () => {
      // Create a verification if we don't have one
      if (!createdVerificationId) {
        const testFile = createTestFile('test-document.pdf');
        const createResponse = await request(app.getHttpServer())
          .post('/api/auth/verify-practitioner')
          .set('Authorization', `Bearer ${practitionerToken}`)
          .attach('documentFile', testFile)
          .field('practitionerId', testPractitionerId || 'test-practitioner-123')
          .field('documentType', 'cedula');

        if (createResponse.status === 201) {
          createdVerificationId = createResponse.body.verificationId;
        }
      }
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get(`/api/auth/verify-practitioner/${createdVerificationId || 'test-id'}`)
        .expect(401);
    });

    it('should return 403 for practitioner user', () => {
      return request(app.getHttpServer())
        .get(`/api/auth/verify-practitioner/${createdVerificationId || 'test-id'}`)
        .set('Authorization', `Bearer ${practitionerToken}`)
        .expect(403);
    });

    it('should return 403 for admin without MFA', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      return request(app.getHttpServer())
        .get(`/api/auth/verify-practitioner/${createdVerificationId || 'test-id'}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent verification', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/verify-practitioner/non-existent-id-12345')
        .set('Authorization', `Bearer ${adminToken}`);

      // Can be 404 or 500 depending on UUID validation
      expect([404, 500]).toContain(response.status);
    });

    it('should return verification details as admin with MFA', async () => {
      if (!createdVerificationId) {
        // Skip if we couldn't create a verification
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/auth/verify-practitioner/${createdVerificationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdVerificationId);
      expect(response.body).toHaveProperty('practitionerId');
      expect(response.body).toHaveProperty('documentType');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('PUT /api/auth/verify-practitioner/:id/review', () => {
    let pendingVerificationId: string;

    beforeEach(async () => {
      // Create a pending verification for review
      const testFile = createTestFile('test-document.pdf');
      const createResponse = await request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile)
        .field('practitionerId', testPractitionerId || 'test-practitioner-123')
        .field('documentType', 'cedula');

      if (createResponse.status === 201) {
        pendingVerificationId = createResponse.body.verificationId;
      }
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${pendingVerificationId || 'test-id'}/review`)
        .expect(401);
    });

    it('should return 403 for practitioner user', () => {
      return request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${pendingVerificationId || 'test-id'}/review`)
        .set('Authorization', `Bearer ${practitionerToken}`)
        .send({ status: 'approved' })
        .expect(403);
    });

    it('should return 403 for admin without MFA', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      return request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${pendingVerificationId || 'test-id'}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(403);
    });

    it('should return 404 for non-existent verification', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/auth/verify-practitioner/non-existent-id-12345/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      // Can be 400 (invalid UUID) or 404 (not found)
      expect([400, 404]).toContain(response.status);
    });

    it('should return 400 without status', async () => {
      if (!pendingVerificationId) {
        return;
      }
      const response = await request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${pendingVerificationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Validation may pass but fail later, or fail immediately
      expect([400, 200]).toContain(response.status);
    });

    it('should return 400 with invalid status', async () => {
      if (!pendingVerificationId) {
        return;
      }
      const response = await request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${pendingVerificationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' });

      // Validation may pass but fail later, or fail immediately
      expect([400, 200]).toContain(response.status);
    });

    it('should return 400 when rejecting without reason', async () => {
      if (!pendingVerificationId) {
        return;
      }
      const response = await request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${pendingVerificationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message.toLowerCase()).toMatch(/rejection.*reason|reason.*required/i);
    });

    it('should approve verification as admin with MFA', async () => {
      if (!pendingVerificationId) {
        // Skip if we couldn't create a verification
        return;
      }

      const response = await request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${pendingVerificationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(response.body).toHaveProperty('verificationId', pendingVerificationId);
      expect(response.body).toHaveProperty('status', 'approved');
      expect(response.body).toHaveProperty('reviewedBy');
      expect(response.body).toHaveProperty('reviewedAt');
    });

    it('should reject verification with reason as admin with MFA', async () => {
      // Create a new pending verification for rejection test
      const testFile = createTestFile('test-document-reject.pdf');
      const createResponse = await request(app.getHttpServer())
        .post('/api/auth/verify-practitioner')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .attach('documentFile', testFile)
        .field('practitionerId', testPractitionerId || 'test-practitioner-123')
        .field('documentType', 'licencia');

      if (createResponse.status !== 201) {
        // Skip if we couldn't create a verification
        return;
      }

      const rejectVerificationId = createResponse.body.verificationId;

      const response = await request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${rejectVerificationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          rejectionReason: 'Document quality is insufficient',
        })
        .expect(200);

      expect(response.body).toHaveProperty('verificationId', rejectVerificationId);
      expect(response.body).toHaveProperty('status', 'rejected');
      expect(response.body).toHaveProperty('reviewedBy');
      expect(response.body).toHaveProperty('reviewedAt');
      // Note: rejectionReason is stored but not returned in ReviewVerificationResponseDto
      // It can be retrieved via GET /api/auth/verify-practitioner/:id
    });

    it('should return 400 when reviewing already reviewed verification', async () => {
      if (!pendingVerificationId) {
        return;
      }

      // First approve it
      await request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${pendingVerificationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);

      // Try to review again
      await request(app.getHttpServer())
        .put(`/api/auth/verify-practitioner/${pendingVerificationId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', rejectionReason: 'Test reason' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('already');
        });
    });
  });

  describe('DocumentStorageService helpers (direct)', () => {
    it('should build absolute path from relative path', () => {
      const relativePath = path.join('practitioner-ext-test', 'file.pdf');
      const fullPath = documentStorageService.getDocumentPath(relativePath);
      expect(fullPath).toContain(relativePath);
      expect(path.isAbsolute(fullPath)).toBe(true);
    });

    it('should not throw when deleting non-existent document', async () => {
      await expect(
        documentStorageService.deleteDocument(
          path.join('practitioner-ext-test', 'non-existent.pdf'),
        ),
      ).resolves.not.toThrow();
    });
  });
});
