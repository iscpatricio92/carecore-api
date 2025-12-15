import { RequestIdMiddleware } from './request-id.middleware';
import { Request, Response, NextFunction } from 'express';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockNext = jest.fn();
    mockResponse = {
      setHeader: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should generate a new request ID when header is not present', () => {
      mockRequest = {
        headers: {},
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.requestId).toBeDefined();
      expect(typeof mockRequest.requestId).toBe('string');
      expect(mockRequest.requestId?.length).toBeGreaterThan(0);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', mockRequest.requestId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use request ID from x-request-id header when present', () => {
      const existingRequestId = 'existing-request-id-123';
      mockRequest = {
        headers: {
          'x-request-id': existingRequestId,
        },
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.requestId).toBe(existingRequestId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', existingRequestId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next function', () => {
      mockRequest = {
        headers: {},
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should set response header with request ID', () => {
      mockRequest = {
        headers: {},
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
    });
  });
});
