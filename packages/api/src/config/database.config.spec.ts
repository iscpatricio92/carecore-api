import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from './database.config';
import { PatientEntity } from '../entities/patient.entity';
import { PractitionerEntity } from '../entities/practitioner.entity';
import { EncounterEntity } from '../entities/encounter.entity';
import { ConsentEntity } from '../entities/consent.entity';
import { DocumentReferenceEntity } from '../entities/document-reference.entity';

/**
 * Test constants - These are mock values for testing purposes only.
 * They are NOT real credentials and should NEVER be used in production.
 */
const TEST_DB_CONFIG = {
  HOST: 'localhost',
  PORT: 5432,
  USER: 'testuser',
  PASSWORD: 'testpass', // Mock password for testing only
  NAME: 'testdb',
} as const;

const TEST_DB_CONFIG_CUSTOM = {
  HOST: 'custom-host',
  PORT: 5433,
  USER: 'custom-user',
  PASSWORD: 'custom-password', // Mock password for testing only
  NAME: 'custom-db',
} as const;

describe('DatabaseConfig', () => {
  let config: DatabaseConfig;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseConfig,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    config = module.get<DatabaseConfig>(DatabaseConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(config).toBeDefined();
  });

  describe('createTypeOrmOptions', () => {
    it('should return TypeORM options with provided values', () => {
      // Using test constants - these are mock values for testing only
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          NODE_ENV: 'development',
          DB_HOST: TEST_DB_CONFIG.HOST,
          DB_PORT: TEST_DB_CONFIG.PORT,
          DB_USER: TEST_DB_CONFIG.USER,
          DB_PASSWORD: TEST_DB_CONFIG.PASSWORD,
          DB_NAME: TEST_DB_CONFIG.NAME,
          DB_SYNCHRONIZE: false,
        };
        return values[key] ?? defaultValue;
      });

      const result = config.createTypeOrmOptions() as Record<string, unknown>;

      expect(result).toBeDefined();
      expect(result.type).toBe('postgres');
      expect(result.host).toBe(TEST_DB_CONFIG.HOST);
      expect(result.port).toBe(TEST_DB_CONFIG.PORT);
      expect(result.username).toBe(TEST_DB_CONFIG.USER);
      expect(result.database).toBe(TEST_DB_CONFIG.NAME);
      expect(result.entities).toBeDefined();
      expect(result.migrations).toBeDefined();
    });

    it('should use values from ConfigService', () => {
      // Using test constants - these are mock values for testing only
      mockConfigService.get.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          DB_HOST: TEST_DB_CONFIG_CUSTOM.HOST,
          DB_PORT: TEST_DB_CONFIG_CUSTOM.PORT,
          DB_USER: TEST_DB_CONFIG_CUSTOM.USER,
          DB_PASSWORD: TEST_DB_CONFIG_CUSTOM.PASSWORD,
          DB_NAME: TEST_DB_CONFIG_CUSTOM.NAME,
        };
        return values[key];
      });

      const result = config.createTypeOrmOptions() as {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
      };

      expect(result.host).toBe(TEST_DB_CONFIG_CUSTOM.HOST);
      expect(result.port).toBe(TEST_DB_CONFIG_CUSTOM.PORT);
      expect(result.username).toBe(TEST_DB_CONFIG_CUSTOM.USER);
      expect(result.password).toBe(TEST_DB_CONFIG_CUSTOM.PASSWORD);
      expect(result.database).toBe(TEST_DB_CONFIG_CUSTOM.NAME);
    });

    /**
     * Helper function to create mock database config values for testing.
     * These are mock values only and should NEVER be used in production.
     */
    const createMockDbConfig = (
      nodeEnv: string,
      synchronize: boolean,
    ): Record<string, unknown> => ({
      NODE_ENV: nodeEnv,
      DB_HOST: TEST_DB_CONFIG.HOST,
      DB_PORT: TEST_DB_CONFIG.PORT,
      DB_USER: TEST_DB_CONFIG.USER,
      DB_PASSWORD: TEST_DB_CONFIG.PASSWORD,
      DB_NAME: TEST_DB_CONFIG.NAME,
      DB_SYNCHRONIZE: synchronize,
    });

    it('should set synchronize to false in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('production', false)[key];
      });

      const result = config.createTypeOrmOptions();

      expect(result.synchronize).toBe(false);
    });

    it('should set synchronize based on NODE_ENV and DB_SYNCHRONIZE in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('development', true)[key];
      });

      const result = config.createTypeOrmOptions();

      expect(result.synchronize).toBe(true);
    });

    it('should set synchronize to false when DB_SYNCHRONIZE is false in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('development', false)[key];
      });

      const result = config.createTypeOrmOptions();

      expect(result.synchronize).toBe(false);
    });

    it('should set synchronize to true in test mode when DB_SYNCHRONIZE is true', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('test', true)[key];
      });

      const result = config.createTypeOrmOptions();

      expect(result.synchronize).toBe(true);
    });

    it('should enable logging in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('development', false)[key];
      });

      const result = config.createTypeOrmOptions();

      expect(result.logging).toBe(true);
    });

    it('should enable logging in test mode', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('test', false)[key];
      });

      const result = config.createTypeOrmOptions();

      expect(result.logging).toBe(true);
    });

    it('should disable logging in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('production', false)[key];
      });

      const result = config.createTypeOrmOptions();

      expect(result.logging).toBe(false);
    });

    it('should enable SSL in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('production', false)[key];
      });

      const result = config.createTypeOrmOptions() as { ssl: unknown };

      expect(result.ssl).toEqual({
        rejectUnauthorized: false,
      });
    });

    it('should disable SSL in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('development', false)[key];
      });

      const result = config.createTypeOrmOptions() as { extra: { sslmode: string } };

      expect(result.extra).toEqual({
        sslmode: 'disable',
      });
    });

    it('should include entity classes', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('development', false)[key];
      });

      const result = config.createTypeOrmOptions() as { entities: unknown[] };

      expect(Array.isArray(result.entities)).toBe(true);
      expect(result.entities.length).toBeGreaterThan(0);
      // Verify that entities are classes/functions (not strings)
      expect(typeof result.entities[0]).toBe('function');
      // Verify that all expected entities are included
      expect(result.entities).toContain(PatientEntity);
      expect(result.entities).toContain(PractitionerEntity);
      expect(result.entities).toContain(EncounterEntity);
      expect(result.entities).toContain(ConsentEntity);
      expect(result.entities).toContain(DocumentReferenceEntity);
    });

    it('should include migrations path pattern', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        return createMockDbConfig('development', false)[key];
      });

      const result = config.createTypeOrmOptions() as { migrations: string[] };

      expect(Array.isArray(result.migrations)).toBe(true);
      expect(result.migrations.length).toBeGreaterThan(0);
      expect(result.migrations[0]).toContain('migrations');
    });
  });
});
