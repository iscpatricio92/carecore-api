import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from './database.config';

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
    it('should return TypeORM options with default values', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        return defaultValue;
      });

      const result = config.createTypeOrmOptions() as Record<string, unknown>;

      expect(result).toBeDefined();
      expect(result.type).toBe('postgres');
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(5432);
      expect(result.username).toBe('carecore');
      expect(result.database).toBe('carecore_db');
      expect(result.entities).toBeDefined();
      expect(result.migrations).toBeDefined();
    });

    it('should use values from ConfigService', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const values: Record<string, unknown> = {
          DB_HOST: 'custom-host',
          DB_PORT: 5433,
          DB_USER: 'custom-user',
          DB_PASSWORD: 'custom-password',
          DB_NAME: 'custom-db',
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

      expect(result.host).toBe('custom-host');
      expect(result.port).toBe(5433);
      expect(result.username).toBe('custom-user');
      expect(result.password).toBe('custom-password');
      expect(result.database).toBe('custom-db');
    });

    it('should set synchronize to false in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'DB_SYNCHRONIZE') return false;
        return undefined;
      });

      const result = config.createTypeOrmOptions();

      expect(result.synchronize).toBe(false);
    });

    it('should set synchronize based on NODE_ENV and DB_SYNCHRONIZE in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'DB_SYNCHRONIZE') return true;
        return undefined;
      });

      const result = config.createTypeOrmOptions();

      expect(result.synchronize).toBe(true);
    });

    it('should set synchronize to false when DB_SYNCHRONIZE is false in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'DB_SYNCHRONIZE') return false;
        return undefined;
      });

      const result = config.createTypeOrmOptions();

      expect(result.synchronize).toBe(false);
    });

    it('should enable logging in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const result = config.createTypeOrmOptions();

      expect(result.logging).toBe(true);
    });

    it('should disable logging in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const result = config.createTypeOrmOptions();

      expect(result.logging).toBe(false);
    });

    it('should enable SSL in production', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const result = config.createTypeOrmOptions() as { ssl: unknown };

      expect(result.ssl).toEqual({
        rejectUnauthorized: false,
      });
    });

    it('should disable SSL in development', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const result = config.createTypeOrmOptions() as { ssl: unknown };

      expect(result.ssl).toBe(false);
    });

    it('should include entities path pattern', () => {
      const result = config.createTypeOrmOptions() as { entities: string[] };

      expect(Array.isArray(result.entities)).toBe(true);
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.entities[0]).toContain('*.entity');
    });

    it('should include migrations path pattern', () => {
      const result = config.createTypeOrmOptions() as { migrations: string[] };

      expect(Array.isArray(result.migrations)).toBe(true);
      expect(result.migrations.length).toBeGreaterThan(0);
      expect(result.migrations[0]).toContain('migrations');
    });
  });
});
