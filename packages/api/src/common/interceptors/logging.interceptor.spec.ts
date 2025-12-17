import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockCallHandler = {
    handle: jest.fn(),
  } as unknown as CallHandler;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') {
          return 'development';
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        { provide: PinoLogger, useValue: mockLogger },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should skip logging for health check endpoints', async () => {
    const request = {
      method: 'GET',
      url: '/api',
      body: {},
      query: {},
      params: {},
      requestId: 'test-request-id',
    };
    const response = { statusCode: 200 };
    const context = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    const data = { result: 'success' };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(data));

    const result = await firstValueFrom(interceptor.intercept(context, mockCallHandler));
    expect(result).toEqual(data);
    expect(mockLogger.debug).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });
});
