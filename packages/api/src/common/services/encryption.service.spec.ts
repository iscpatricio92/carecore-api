import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { DataSource } from 'typeorm';

describe('EncryptionService', () => {
  let service: EncryptionService;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt a string value', async () => {
      // Create a new service instance with the key set
      mockConfigService.get.mockReturnValue('test-encryption-key-32-chars-long');
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: DataSource, useValue: mockDataSource },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<EncryptionService>(EncryptionService);

      mockDataSource.query.mockResolvedValue([{ encrypted: 'encrypted-base64-value' }]);

      const result = await testService.encrypt('test data');

      expect(result).toBe('encrypted-base64-value');
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('pgp_sym_encrypt'),
        ['test data', 'test-encryption-key-32-chars-long'],
      );
    });

    it('should return empty string for empty input', async () => {
      mockConfigService.get.mockReturnValue('test-key');
      const result = await service.encrypt('');
      expect(result).toBe('');
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should throw error if encryption key is not set', async () => {
      // Create a new service instance without the key
      mockConfigService.get.mockReturnValue(undefined);
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: DataSource, useValue: mockDataSource },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<EncryptionService>(EncryptionService);

      await expect(testService.encrypt('test data')).rejects.toThrow(
        'Encryption key not configured',
      );
    });

    it('should throw error if encryption fails', async () => {
      // Create a new service instance with the key set
      mockConfigService.get.mockReturnValue('test-key');
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: DataSource, useValue: mockDataSource },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<EncryptionService>(EncryptionService);

      mockDataSource.query.mockRejectedValue(new Error('Database error'));

      await expect(testService.encrypt('test data')).rejects.toThrow('Encryption failed');
    });

    it('should throw error if encryption returns no result', async () => {
      mockConfigService.get.mockReturnValue('test-key');
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: DataSource, useValue: mockDataSource },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<EncryptionService>(EncryptionService);

      mockDataSource.query.mockResolvedValue([]);

      await expect(testService.encrypt('test data')).rejects.toThrow(
        'Encryption failed: no result returned',
      );
    });

    it('should throw error if encryption result has no encrypted field', async () => {
      mockConfigService.get.mockReturnValue('test-key');
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: DataSource, useValue: mockDataSource },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<EncryptionService>(EncryptionService);

      mockDataSource.query.mockResolvedValue([{}]);

      await expect(testService.encrypt('test data')).rejects.toThrow(
        'Encryption failed: no result returned',
      );
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted value', async () => {
      // Create a new service instance with the key set
      mockConfigService.get.mockReturnValue('test-encryption-key-32-chars-long');
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: DataSource, useValue: mockDataSource },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<EncryptionService>(EncryptionService);

      mockDataSource.query.mockResolvedValue([{ decrypted: 'test data' }]);

      const result = await testService.decrypt('encrypted-base64-value');

      expect(result).toBe('test data');
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('pgp_sym_decrypt'),
        ['encrypted-base64-value', 'test-encryption-key-32-chars-long'],
      );
    });

    it('should return empty string for empty input', async () => {
      mockConfigService.get.mockReturnValue('test-key');
      const result = await service.decrypt('');
      expect(result).toBe('');
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should throw error if decryption key is not set', async () => {
      // Create a new service instance without the key
      mockConfigService.get.mockReturnValue(undefined);
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: DataSource, useValue: mockDataSource },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<EncryptionService>(EncryptionService);

      await expect(testService.decrypt('encrypted-value')).rejects.toThrow(
        'Encryption key not configured',
      );
    });

    it('should throw error if decryption fails', async () => {
      // Create a new service instance with the key set
      mockConfigService.get.mockReturnValue('test-key');
      const module = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: DataSource, useValue: mockDataSource },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const testService = module.get<EncryptionService>(EncryptionService);

      mockDataSource.query.mockResolvedValue([{ decrypted: null }]);

      await expect(testService.decrypt('encrypted-value')).rejects.toThrow('Decryption failed');
    });
  });

  describe('isPgcryptoAvailable', () => {
    it('should return true if pgcrypto is available', async () => {
      mockDataSource.query.mockResolvedValue([{ exists: true }]);

      const result = await service.isPgcryptoAvailable();

      expect(result).toBe(true);
    });

    it('should return false if pgcrypto is not available', async () => {
      mockDataSource.query.mockResolvedValue([{ exists: false }]);

      const result = await service.isPgcryptoAvailable();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database error'));

      const result = await service.isPgcryptoAvailable();

      expect(result).toBe(false);
    });
  });

  describe('generateRandomKey', () => {
    it('should generate a random key', async () => {
      mockDataSource.query.mockResolvedValue([{ key: 'random-base64-key' }]);

      const result = await service.generateRandomKey();

      expect(result).toBe('random-base64-key');
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('gen_random_bytes'),
        [32],
      );
    });

    it('should generate a key with custom length', async () => {
      mockDataSource.query.mockResolvedValue([{ key: 'random-key' }]);

      await service.generateRandomKey(64);

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('gen_random_bytes'),
        [64],
      );
    });

    it('should throw error if key generation fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database error'));

      await expect(service.generateRandomKey()).rejects.toThrow('Failed to generate random key');
    });
  });
});
