import 'reflect-metadata';

// Ajuste de timeout para suites de integración (más bajo que E2E)
jest.setTimeout(15000);

// Lugar para registrar mocks globales (Keycloak, fetch, fs/promises, etc.)
// Se irán añadiendo conforme se creen las suites de integración.
