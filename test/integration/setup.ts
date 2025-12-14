import 'reflect-metadata';

// Ajuste de timeout para suites de integración (más bajo que E2E)
jest.setTimeout(15000);

// Mock @keycloak/keycloak-admin-client para evitar problemas con ES modules en Jest
jest.mock('@keycloak/keycloak-admin-client', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      auth: {
        getAccessToken: jest.fn(),
      },
      users: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        listRoleMappings: jest.fn(),
        addRealmRoleMappings: jest.fn(),
        delRealmRoleMappings: jest.fn(),
      },
      roles: {
        findOne: jest.fn(),
      },
      authenticationManagement: {
        sendExecuteActionsEmail: jest.fn(),
      },
    })),
  };
});

// Lugar para registrar mocks globales (Keycloak, fetch, fs/promises, etc.)
// Se irán añadiendo conforme se creen las suites de integración.
