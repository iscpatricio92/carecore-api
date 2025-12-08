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
} from './helpers/jwt-helper';

describe('Auth MFA E2E', () => {
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

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/mfa/setup', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer()).post('/api/auth/mfa/setup').expect(401);
    });

    it('should setup MFA for patient user', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.generateTOTPSecret.mockResolvedValue({
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KG...',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('manualEntryKey');
      expect(response.body).toHaveProperty('message');
      expect(response.body.qrCode).toContain('data:image/png;base64');
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('patient-user-123');
      expect(mockKeycloakAdminService.generateTOTPSecret).toHaveBeenCalledWith('patient-user-123');
    });

    it('should setup MFA for admin user', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.generateTOTPSecret.mockResolvedValue({
        secret: 'ADMINSECRET123456',
        qrCode: 'data:image/png;base64,iVBORw0KG...',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('admin-user-789');
      expect(mockKeycloakAdminService.generateTOTPSecret).toHaveBeenCalledWith('admin-user-789');
    });

    it('should return 400 if MFA is already configured', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('MFA is already configured');
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('patient-user-123');
      expect(mockKeycloakAdminService.generateTOTPSecret).not.toHaveBeenCalled();
    });

    it('should return 400 if TOTP secret generation fails', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.generateTOTPSecret.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Failed to generate TOTP secret');
    });

    it('should return 400 if TOTP secret is missing', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.generateTOTPSecret.mockResolvedValue({
        secret: null,
        qrCode: 'data:image/png;base64,iVBORw0KG...',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Failed to generate TOTP secret');
    });
  });

  describe('POST /api/auth/mfa/verify', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .send({ code: '123456' })
        .expect(401);
    });

    it('should verify and enable MFA for patient user', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.verifyAndEnableTOTP.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '123456' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('mfaEnabled', true);
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('patient-user-123');
      expect(mockKeycloakAdminService.verifyAndEnableTOTP).toHaveBeenCalledWith(
        'patient-user-123',
        '123456',
      );
    });

    it('should verify and enable MFA for admin user', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.verifyAndEnableTOTP.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: '654321' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mfaEnabled', true);
      expect(mockKeycloakAdminService.verifyAndEnableTOTP).toHaveBeenCalledWith(
        'admin-user-789',
        '654321',
      );
    });

    it('should return 400 if MFA is already enabled', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '123456' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('MFA is already enabled');
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('patient-user-123');
      expect(mockKeycloakAdminService.verifyAndEnableTOTP).not.toHaveBeenCalled();
    });

    it('should return 400 if TOTP code is invalid', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.verifyAndEnableTOTP.mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '000000' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid TOTP code');
    });

    it('should return 400 if code is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 if code is not 6 digits', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '12345' })
        .expect(400);
    });

    it('should return 400 if code contains non-digits', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '12345a' })
        .expect(400);
    });
  });

  describe('POST /api/auth/mfa/disable', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .send({ code: '123456' })
        .expect(401);
    });

    it('should disable MFA for patient user', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      mockKeycloakAdminService.verifyTOTPCode.mockResolvedValue(true);
      mockKeycloakAdminService.removeTOTPCredential.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '123456' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('mfaEnabled', false);
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('patient-user-123');
      expect(mockKeycloakAdminService.verifyTOTPCode).toHaveBeenCalledWith(
        'patient-user-123',
        '123456',
      );
      expect(mockKeycloakAdminService.removeTOTPCredential).toHaveBeenCalledWith(
        'patient-user-123',
      );
    });

    it('should disable MFA for admin user', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      mockKeycloakAdminService.verifyTOTPCode.mockResolvedValue(true);
      mockKeycloakAdminService.removeTOTPCredential.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: '654321' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mfaEnabled', false);
      expect(mockKeycloakAdminService.removeTOTPCredential).toHaveBeenCalledWith('admin-user-789');
    });

    it('should return 400 if MFA is not enabled', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '123456' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('MFA is not enabled');
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('patient-user-123');
      expect(mockKeycloakAdminService.verifyTOTPCode).not.toHaveBeenCalled();
    });

    it('should return 400 if TOTP code is invalid', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      mockKeycloakAdminService.verifyTOTPCode.mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '000000' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid TOTP code');
      expect(mockKeycloakAdminService.verifyTOTPCode).toHaveBeenCalledWith(
        'patient-user-123',
        '000000',
      );
      expect(mockKeycloakAdminService.removeTOTPCredential).not.toHaveBeenCalled();
    });

    it('should return 400 if credential removal fails', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      mockKeycloakAdminService.verifyTOTPCode.mockResolvedValue(true);
      mockKeycloakAdminService.removeTOTPCredential.mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '123456' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Failed to disable MFA');
    });

    it('should return 400 if code is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 if code is not 6 digits', () => {
      return request(app.getHttpServer())
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ code: '12345' })
        .expect(400);
    });
  });

  describe('GET /api/auth/mfa/status', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/api/auth/mfa/status').expect(401);
    });

    it('should return MFA status for patient user (MFA not enabled, not required)', async () => {
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'patient-user-123',
        username: 'testpatient',
        email: 'patient@test.com',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['patient']);
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('mfaEnabled', false);
      expect(response.body).toHaveProperty('mfaRequired', false);
      expect(response.body).toHaveProperty('message');
      // Message can vary, just check it exists
      expect(typeof response.body.message).toBe('string');
    });

    it('should return MFA status for admin user (MFA enabled, required)', async () => {
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'admin-user-789',
        username: 'testadmin',
        email: 'admin@test.com',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['admin']);
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('mfaEnabled', true);
      expect(response.body).toHaveProperty('mfaRequired', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('MFA is enabled');
    });

    it('should return MFA status for practitioner user (MFA enabled, required)', async () => {
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'practitioner-user-456',
        username: 'testpractitioner',
        email: 'practitioner@test.com',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['practitioner']);
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('mfaEnabled', true);
      expect(response.body).toHaveProperty('mfaRequired', true);
      expect(response.body.message).toContain('MFA is enabled');
    });

    it('should return MFA status for patient with MFA enabled (not required)', async () => {
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'patient-user-123',
        username: 'testpatient',
        email: 'patient@test.com',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['patient']);
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('mfaEnabled', true);
      expect(response.body).toHaveProperty('mfaRequired', false);
      expect(response.body.message).toContain('MFA is enabled');
    });

    it('should return 404 if user not found', async () => {
      mockKeycloakAdminService.findUserById.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });
  });
});
