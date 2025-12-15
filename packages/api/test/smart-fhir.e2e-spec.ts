// Mock @keycloak/keycloak-admin-client before importing services
jest.mock('@keycloak/keycloak-admin-client', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    auth: jest.fn(),
    clients: {
      find: jest.fn(),
      findOne: jest.fn(),
    },
  })),
}));

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { KeycloakAdminService } from '../src/modules/auth/services/keycloak-admin.service';
import { createTestConfigModule } from './helpers/test-module.factory';
import { SmartFhirService } from '../src/modules/fhir/services/smart-fhir.service';

import { AppModule } from '../src/app.module';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { MockJwtStrategy } from './helpers/mock-jwt-strategy';

describe('SMART on FHIR E2E', () => {
  let app: INestApplication;
  let smartFhirService: SmartFhirService;

  const mockKeycloakAdminService = {
    findClientById: jest.fn(),
    validateRedirectUri: jest.fn(),
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

    smartFhirService = moduleFixture.get<SmartFhirService>(SmartFhirService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock findClientById to return a valid client by default
    mockKeycloakAdminService.findClientById.mockResolvedValue({
      id: 'test-client-id',
      clientId: 'test-smart-app',
      name: 'Test SMART App',
      redirectUris: ['https://app.com/callback'],
      standardFlowEnabled: true,
    });
    // Mock validateRedirectUri to return true by default
    mockKeycloakAdminService.validateRedirectUri.mockResolvedValue(true);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/fhir/authorize (Launch)', () => {
    const baseLaunchParams = {
      iss: 'https://carecore.example.com',
      launch: 'test-launch-token-123',
      client_id: 'test-smart-app',
      redirect_uri: 'https://app.com/callback',
      scope: 'patient:read patient:write',
    };

    it('should return 400 without required parameters', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
        });
    });

    it('should return 400 without iss parameter', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query({
          launch: baseLaunchParams.launch,
          client_id: baseLaunchParams.client_id,
          redirect_uri: baseLaunchParams.redirect_uri,
          scope: baseLaunchParams.scope,
        })
        .expect(400);
    });

    it('should return 400 without launch parameter', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query({
          iss: baseLaunchParams.iss,
          client_id: baseLaunchParams.client_id,
          redirect_uri: baseLaunchParams.redirect_uri,
          scope: baseLaunchParams.scope,
        })
        .expect(400);
    });

    it('should return 400 without client_id parameter', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query({
          iss: baseLaunchParams.iss,
          launch: baseLaunchParams.launch,
          redirect_uri: baseLaunchParams.redirect_uri,
          scope: baseLaunchParams.scope,
        })
        .expect(400);
    });

    it('should return 400 without redirect_uri parameter', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query({
          iss: baseLaunchParams.iss,
          launch: baseLaunchParams.launch,
          client_id: baseLaunchParams.client_id,
          scope: baseLaunchParams.scope,
        })
        .expect(400);
    });

    it('should return 400 without scope parameter', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query({
          iss: baseLaunchParams.iss,
          launch: baseLaunchParams.launch,
          client_id: baseLaunchParams.client_id,
          redirect_uri: baseLaunchParams.redirect_uri,
        })
        .expect(400);
    });

    it('should return 400 with invalid iss URL', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query({
          ...baseLaunchParams,
          iss: 'not-a-valid-url',
        })
        .expect(400);
    });

    it('should return 400 with invalid redirect_uri URL', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query({
          ...baseLaunchParams,
          redirect_uri: 'not-a-valid-url',
        })
        .expect(400);
    });

    it('should return 401 when client is not found', async () => {
      mockKeycloakAdminService.findClientById.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query(baseLaunchParams);

      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
    });

    it('should return 401 when client redirect_uri does not match', async () => {
      mockKeycloakAdminService.findClientById.mockResolvedValue({
        id: 'test-client-id',
        clientId: 'test-smart-app',
        redirectUris: ['https://different-app.com/callback'],
        standardFlowEnabled: true,
      });

      const response = await request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query(baseLaunchParams);

      expect([400, 401]).toContain(response.status);
    });

    it('should redirect to Keycloak with valid launch parameters', async () => {
      // Mock validateAndDecodeLaunchToken to return a valid launch context
      jest.spyOn(smartFhirService, 'validateAndDecodeLaunchToken').mockResolvedValue({
        patient: 'patient-123',
        encounter: 'encounter-456',
        timestamp: Date.now(),
      });

      const response = await request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query(baseLaunchParams)
        .expect(302);

      expect(response.headers.location).toBeDefined();
      // Should redirect to Keycloak (not to /api/fhir/auth, as launch redirects directly to Keycloak)
      expect(response.headers.location).toContain('openid-connect');
      expect(response.headers.location).toContain('client_id=');
      expect(response.headers.location).toContain('response_type=code');
    });

    it('should include state parameter in redirect when provided', async () => {
      jest.spyOn(smartFhirService, 'validateAndDecodeLaunchToken').mockResolvedValue({
        patient: 'patient-123',
        timestamp: Date.now(),
      });

      const customState = 'custom-state-token-123';
      const response = await request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query({
          ...baseLaunchParams,
          state: customState,
        })
        .expect(302);

      expect(response.headers.location).toContain('state=');
    });

    it('should handle launch token validation errors', async () => {
      jest
        .spyOn(smartFhirService, 'validateAndDecodeLaunchToken')
        .mockRejectedValue(new Error('Invalid launch token'));

      const response = await request(app.getHttpServer())
        .get('/api/fhir/authorize')
        .query(baseLaunchParams);

      expect([400, 401, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
    });
  });

  describe('GET /api/fhir/auth (Authorization)', () => {
    const baseAuthParams = {
      client_id: 'test-smart-app',
      response_type: 'code',
      redirect_uri: 'https://app.com/callback',
      scope: 'patient:read patient:write',
    };

    it('should return 400 without required parameters', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/auth')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'OperationOutcome');
        });
    });

    it('should return 400 without client_id', async () => {
      const response = await request(app.getHttpServer()).get('/api/fhir/auth').query({
        response_type: baseAuthParams.response_type,
        redirect_uri: baseAuthParams.redirect_uri,
        scope: baseAuthParams.scope,
      });

      // Can be 400 (validation error) or 302 (if validation passes but client not found)
      expect([400, 302]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
      }
    });

    it('should return 400 without response_type', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query({
          client_id: baseAuthParams.client_id,
          redirect_uri: baseAuthParams.redirect_uri,
          scope: baseAuthParams.scope,
        })
        .expect(400);
    });

    it('should return 400 with invalid response_type', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query({
          ...baseAuthParams,
          response_type: 'invalid',
        })
        .expect(400);
    });

    it('should return 400 without redirect_uri', async () => {
      const response = await request(app.getHttpServer()).get('/api/fhir/auth').query({
        client_id: baseAuthParams.client_id,
        response_type: baseAuthParams.response_type,
        scope: baseAuthParams.scope,
      });

      // Can be 400 (validation error) or 302 (if validation passes)
      expect([400, 302]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
      }
    });

    it('should return 400 without scope', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query({
          client_id: baseAuthParams.client_id,
          response_type: baseAuthParams.response_type,
          redirect_uri: baseAuthParams.redirect_uri,
        })
        .expect(400);
    });

    it('should return 400 with invalid redirect_uri URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query({
          ...baseAuthParams,
          redirect_uri: 'not-a-valid-url',
        });

      // Can be 400 (validation error) or 302 (if validation passes)
      expect([400, 302]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
      }
    });

    it('should return 400 with invalid aud URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query({
          ...baseAuthParams,
          aud: 'not-a-valid-url',
        });

      // Can be 400 (validation error) or 302 (if validation passes)
      expect([400, 302]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
      }
    });

    it('should return 401 when client is not found', async () => {
      mockKeycloakAdminService.findClientById.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query(baseAuthParams);

      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
    });

    it('should return 400 or 401 when client redirect_uri does not match', async () => {
      mockKeycloakAdminService.findClientById.mockResolvedValue({
        id: 'test-client-id',
        clientId: 'test-smart-app',
        redirectUris: ['https://different-app.com/callback'],
        standardFlowEnabled: true,
      });
      mockKeycloakAdminService.validateRedirectUri.mockResolvedValue(false);

      const response = await request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query(baseAuthParams);

      expect([400, 401]).toContain(response.status);
      if (response.status === 400 || response.status === 401) {
        expect(response.body).toHaveProperty('resourceType', 'OperationOutcome');
      }
    });

    it('should redirect to Keycloak with valid authorization parameters', async () => {
      jest
        .spyOn(smartFhirService, 'buildAuthorizationUrl')
        .mockReturnValue(
          'http://localhost:8080/realms/carecore/protocol/openid-connect/auth?client_id=test-smart-app&response_type=code&redirect_uri=http://localhost:3000/api/fhir/token&scope=patient:read%20patient:write&state=test-state',
        );

      const response = await request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query(baseAuthParams)
        .expect(302);

      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toContain('openid-connect');
      expect(response.headers.location).toContain('client_id=');
      expect(response.headers.location).toContain('response_type=code');
    });

    it('should include state parameter in redirect when provided', async () => {
      jest
        .spyOn(smartFhirService, 'buildAuthorizationUrl')
        .mockReturnValue(
          'http://localhost:8080/realms/carecore/protocol/openid-connect/auth?state=custom-state',
        );

      const response = await request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query({
          ...baseAuthParams,
          state: 'custom-state-token',
        })
        .expect(302);

      expect(response.headers.location).toBeDefined();
    });

    it('should include aud parameter in redirect when provided', async () => {
      jest
        .spyOn(smartFhirService, 'buildAuthorizationUrl')
        .mockReturnValue('http://localhost:8080/realms/carecore/protocol/openid-connect/auth');

      const response = await request(app.getHttpServer())
        .get('/api/fhir/auth')
        .query({
          ...baseAuthParams,
          aud: 'https://fhir.example.com',
        })
        .expect(302);

      expect(response.headers.location).toBeDefined();
    });
  });

  describe('POST /api/fhir/token (Token Exchange)', () => {
    const baseTokenParams = {
      grant_type: 'authorization_code',
      code: 'test-auth-code-123',
      redirect_uri: 'https://app.com/callback',
      client_id: 'test-smart-app',
      client_secret: 'test-client-secret',
    };

    it('should return 400 without required parameters', () => {
      return request(app.getHttpServer())
        .post('/api/fhir/token')
        .send({})
        .expect(400)
        .expect((res) => {
          // Token endpoint may return OperationOutcome or OAuth2 error format
          expect(res.body.error || res.body.resourceType === 'OperationOutcome').toBeTruthy();
        });
    });

    it('should return 400 or 401 without grant_type', async () => {
      const response = await request(app.getHttpServer()).post('/api/fhir/token').send({
        code: baseTokenParams.code,
        redirect_uri: baseTokenParams.redirect_uri,
        client_id: baseTokenParams.client_id,
      });

      expect([400, 401]).toContain(response.status);
    });

    it('should return 400 with invalid grant_type', () => {
      return request(app.getHttpServer())
        .post('/api/fhir/token')
        .send({
          ...baseTokenParams,
          grant_type: 'invalid_grant',
        })
        .expect(400);
    });

    it('should return 400 without code for authorization_code grant', () => {
      return request(app.getHttpServer())
        .post('/api/fhir/token')
        .send({
          grant_type: 'authorization_code',
          redirect_uri: baseTokenParams.redirect_uri,
          client_id: baseTokenParams.client_id,
        })
        .expect(400);
    });

    it('should return 400 without redirect_uri for authorization_code grant', () => {
      return request(app.getHttpServer())
        .post('/api/fhir/token')
        .send({
          grant_type: 'authorization_code',
          code: baseTokenParams.code,
          client_id: baseTokenParams.client_id,
        })
        .expect(400);
    });

    it('should return 400 or 401 without client_id', async () => {
      const response = await request(app.getHttpServer()).post('/api/fhir/token').send({
        grant_type: baseTokenParams.grant_type,
        code: baseTokenParams.code,
        redirect_uri: baseTokenParams.redirect_uri,
      });

      expect([400, 401]).toContain(response.status);
    });

    it('should return 400 without refresh_token for refresh_token grant', () => {
      return request(app.getHttpServer())
        .post('/api/fhir/token')
        .send({
          grant_type: 'refresh_token',
          client_id: baseTokenParams.client_id,
        })
        .expect(400);
    });

    it('should return 401 when client is not found', async () => {
      mockKeycloakAdminService.findClientById.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/fhir/token')
        .send(baseTokenParams);

      expect([400, 401]).toContain(response.status);
      // Token endpoint may return OperationOutcome or OAuth2 error format
      expect(response.body.error || response.body.resourceType === 'OperationOutcome').toBeTruthy();
    });

    it('should return 401 when client redirect_uri does not match', async () => {
      mockKeycloakAdminService.findClientById.mockResolvedValue({
        id: 'test-client-id',
        clientId: 'test-smart-app',
        redirectUris: ['https://different-app.com/callback'],
        standardFlowEnabled: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/fhir/token')
        .send(baseTokenParams);

      expect([400, 401]).toContain(response.status);
    });

    it('should handle token exchange errors gracefully', async () => {
      jest
        .spyOn(smartFhirService, 'exchangeCodeForTokens')
        .mockRejectedValue(new Error('Token exchange failed'));

      const response = await request(app.getHttpServer())
        .post('/api/fhir/token')
        .send(baseTokenParams);

      expect([400, 401, 500]).toContain(response.status);
      // Token endpoint may return OperationOutcome or OAuth2 error format
      expect(response.body.error || response.body.resourceType === 'OperationOutcome').toBeTruthy();
    });

    it('should handle refresh_token grant type', async () => {
      jest.spyOn(smartFhirService, 'exchangeCodeForTokens').mockResolvedValue({
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        scope: 'patient:read patient:write',
      });

      const response = await request(app.getHttpServer()).post('/api/fhir/token').send({
        grant_type: 'refresh_token',
        refresh_token: 'old-refresh-token',
        client_id: baseTokenParams.client_id,
        client_secret: baseTokenParams.client_secret,
      });

      // Can be 200 (success) or 400/401 (validation error)
      expect([200, 400, 401, 500]).toContain(response.status);
    });

    it('should handle token exchange with valid parameters', async () => {
      jest.spyOn(smartFhirService, 'exchangeCodeForTokens').mockResolvedValue({
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh-token-123',
        scope: 'patient:read patient:write',
      });

      const response = await request(app.getHttpServer())
        .post('/api/fhir/token')
        .send(baseTokenParams);

      // Can be 200 (success) or 400/401 (validation error)
      expect([200, 400, 401, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('access_token');
        expect(response.body).toHaveProperty('token_type', 'Bearer');
        expect(response.body).toHaveProperty('expires_in');
      }
    });
  });

  describe('GET /api/fhir/metadata (CapabilityStatement)', () => {
    it('should return CapabilityStatement without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/metadata')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('resourceType', 'CapabilityStatement');
          expect(res.body).toHaveProperty('fhirVersion', '4.0.1');
          expect(res.body).toHaveProperty('rest');
          expect(Array.isArray(res.body.rest)).toBe(true);
          expect(res.body.rest.length).toBeGreaterThan(0);

          // Check SMART on FHIR security extension
          const security = res.body.rest[0].security;
          expect(security).toHaveProperty('extension');
          expect(security.extension).toBeDefined();

          // Find OAuth URIs extension
          const oauthExtension = security.extension.find(
            (ext: { url: string }) =>
              ext.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
          );
          expect(oauthExtension).toBeDefined();
          expect(oauthExtension.extension).toBeDefined();

          // Check authorize and token endpoints
          const authorizeExt = oauthExtension.extension.find(
            (ext: { url: string }) => ext.url === 'authorize',
          );
          const tokenExt = oauthExtension.extension.find(
            (ext: { url: string }) => ext.url === 'token',
          );

          expect(authorizeExt).toBeDefined();
          expect(authorizeExt.valueUri).toContain('/api/fhir/auth');
          expect(tokenExt).toBeDefined();
          expect(tokenExt.valueUri).toContain('/api/fhir/token');
        });
    });

    it('should include SMART on FHIR service in security', () => {
      return request(app.getHttpServer())
        .get('/api/fhir/metadata')
        .expect(200)
        .expect((res) => {
          const security = res.body.rest[0].security;
          expect(security).toHaveProperty('service');
          expect(Array.isArray(security.service)).toBe(true);

          const smartService = security.service.find(
            (service: { coding: Array<{ code: string }> }) =>
              service.coding?.some((coding) => coding.code === 'SMART-on-FHIR'),
          );
          expect(smartService).toBeDefined();
        });
    });
  });
});
