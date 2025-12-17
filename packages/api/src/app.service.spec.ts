import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return API health status', () => {
      const result = service.getHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('CareCore API');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return database health status when connected', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.getDatabaseHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('connected');
      expect(result.connected).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should return database health status when disconnected', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection failed'));

      const result = await service.getDatabaseHealth();

      expect(result).toBeDefined();
      expect(result.status).toBe('disconnected');
      expect(result.connected).toBe(false);
      expect(result.timestamp).toBeDefined();
      if ('error' in result) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
