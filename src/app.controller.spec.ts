import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  const mockAppService = {
    getHealth: jest.fn(),
    getDatabaseHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const expectedResult = {
        status: 'ok',
        service: 'CareCore API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      };

      mockAppService.getHealth.mockReturnValue(expectedResult);

      const result = controller.getHealth();

      expect(result).toEqual(expectedResult);
      expect(service.getHealth).toHaveBeenCalled();
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return database health status', async () => {
      const expectedResult = {
        status: 'connected',
        connected: true,
        timestamp: new Date().toISOString(),
      };

      mockAppService.getDatabaseHealth.mockResolvedValue(expectedResult);

      const result = await controller.getDatabaseHealth();

      expect(result).toEqual(expectedResult);
      expect(service.getDatabaseHealth).toHaveBeenCalled();
    });
  });
});
