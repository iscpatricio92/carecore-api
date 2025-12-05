import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';

import { LoggingInterceptor } from './logging.interceptor';

/**
 * Test constants - These are mock values for testing purposes only.
 * They are NOT real credentials and should NEVER be used in production.
 */
const TEST_PASSWORD = 'secret123'; // Mock password for testing sanitization only
const TEST_USERNAME = 'user'; // Mock username for testing only

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };

  const mockCallHandler = {
    handle: jest.fn(),
  } as unknown as CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
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

  describe('intercept', () => {
    it('should log request and response', (done) => {
      const data = { result: 'success' };
      const request = {
        method: 'GET',
        url: '/api/test',
        body: {},
        query: {},
        params: {},
        requestId: 'test-request-id',
      };
      const response = {
        statusCode: 200,
      };

      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => request,
          getResponse: () => response,
        }),
      } as unknown as ExecutionContext;

      mockCallHandler.handle = jest.fn().mockReturnValue(of(data));

      interceptor.intercept(context, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual(data);
          expect(mockLogger.debug).toHaveBeenCalled();
          expect(mockLogger.info).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should log errors', (done) => {
      const error = new Error('Test error');
      const request = {
        method: 'GET',
        url: '/api/test',
        body: {},
        query: {},
        params: {},
        requestId: 'test-request-id',
      };
      const response = {
        statusCode: 500,
      };

      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => request,
          getResponse: () => response,
        }),
      } as unknown as ExecutionContext;

      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(context, mockCallHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(mockLogger.error).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should sanitize sensitive fields in body', (done) => {
      // Using test constants - these are mock values for testing sanitization only
      const requestWithPassword = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => ({
            method: 'POST',
            url: '/api/test',
            body: { password: TEST_PASSWORD, username: TEST_USERNAME },
            query: {},
            params: {},
            requestId: 'test-request-id',
          }),
          getResponse: () => ({
            statusCode: 200,
          }),
        }),
      } as unknown as ExecutionContext;

      const data = { result: 'success' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(data));

      interceptor.intercept(requestWithPassword, mockCallHandler).subscribe({
        next: () => {
          expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.objectContaining({
              body: expect.objectContaining({
                password: '[REDACTED]',
              }),
            }),
            expect.any(String),
          );
          done();
        },
      });
    });
  });
});
