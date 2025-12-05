# E2E Testing Guide

## Overview

End-to-End (E2E) tests verify the complete flow of the application, from HTTP requests to responses, including authentication, authorization, and business logic.

## Running E2E Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with coverage
npm run test:e2e:cov

# Run E2E tests in watch mode
npm run test:e2e:watch

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run all tests (unit + E2E)
npm run test:all

# Run all tests with coverage
npm run test:all:cov
```

## Test Structure

E2E tests are located in the `test/` directory:

```
test/
├── auth.e2e-spec.ts          # Authentication flow tests
├── authorization.e2e-spec.ts  # Role-based access control tests
├── fhir-protected.e2e-spec.ts # Protected endpoint tests
├── helpers/
│   ├── jwt-helper.ts          # JWT token generation helpers
│   ├── mock-jwt-strategy.ts   # Mock JWT strategy for tests
│   ├── test-module.factory.ts # Test app factory
│   └── test-app.factory.ts    # Alternative test app factory
└── jest-e2e.json              # Jest configuration for E2E
```

## Coverage Reports

E2E test coverage is different from unit test coverage:

- **Unit Tests**: Measure code coverage (lines, branches, functions)
- **E2E Tests**: Measure endpoint coverage (which routes are tested)

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:e2e:cov

# View HTML report
open coverage-e2e/index.html
```

### Coverage Metrics

E2E coverage focuses on:
- **Controllers**: Which endpoints are tested
- **Services**: Which business logic is exercised
- **Guards**: Which authorization rules are verified
- **Strategies**: Which authentication flows are tested

## Test Helpers

### Generating Test Tokens

```typescript
import { generatePatientToken, generateAdminToken } from './helpers/jwt-helper';

// Generate token for a patient
const patientToken = generatePatientToken('user-id-123');

// Generate token for an admin
const adminToken = generateAdminToken('admin-id-456');
```

### Creating Test App

```typescript
import { createTestApp } from './helpers/test-module.factory';

const app = await createTestApp();
// Use app for testing...
await app.close();
```

## Writing E2E Tests

### Example: Testing Authentication

```typescript
describe('Authentication E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should require authentication', () => {
    return request(app.getHttpServer())
      .get('/api/fhir/Patient')
      .expect(401);
  });
});
```

### Example: Testing with Authentication

```typescript
it('should return user info with valid token', () => {
  const token = generatePatientToken();
  return request(app.getHttpServer())
    .get('/api/auth/user')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
    .expect((res) => {
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('roles');
    });
});
```

## Configuration

### Jest E2E Configuration

The E2E tests use a separate Jest configuration (`test/jest-e2e.json`) with:

- **Timeout**: 30 seconds per test
- **Coverage**: Focused on controllers and services
- **Mock Strategy**: Uses `MockJwtStrategy` instead of real Keycloak
- **Cache**: Separate cache directory (`.jest-e2e-cache`)

### Environment Variables

E2E tests use test-only environment variables:

```bash
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USER=test_user
DB_PASSWORD=test_password
DB_NAME=test_db
```

**⚠️ SECURITY NOTE**: All test credentials are for testing only and should NEVER be used in production.

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always close the app in `afterAll`
3. **Tokens**: Use helper functions to generate test tokens
4. **Assertions**: Verify both status codes and response bodies
5. **Performance**: Keep tests fast (< 3 seconds each)

## Troubleshooting

### Tests Failing with 401

- Verify that `MockJwtStrategy` is being used
- Check that tokens are generated correctly
- Ensure `Authorization` header is set correctly

### Tests Timing Out

- Increase timeout in `jest-e2e.json` if needed
- Check for database connection issues
- Verify that mocks are working correctly

### Coverage Showing 0%

- E2E coverage focuses on controllers/services, not all code
- Run `npm run test:e2e:cov` to see endpoint coverage
- Check `coverage-e2e/` directory for HTML reports

## CI/CD Integration

E2E tests run automatically in:

- **Pre-commit hook**: Before each commit
- **CI/CD pipeline**: On every push and PR

See `.husky/pre-commit` and `.github/workflows/ci.yml` for configuration.

