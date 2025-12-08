import { Request, Response } from 'express';

import { RequestIdMiddleware } from '@/common/middleware/request-id.middleware';

describe('RequestIdMiddleware (integration)', () => {
  const middleware = new RequestIdMiddleware();

  const mockReq = (headers: Record<string, string> = {}): Request =>
    ({
      headers,
    }) as unknown as Request;

  const mockRes = (): Response => {
    const headers: Record<string, string> = {};
    return {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      getHeader: (k: string) => headers[k],
    } as unknown as Response;
  };

  it('should generate a new request id when not provided', () => {
    const req = mockReq();
    const res = mockRes();

    middleware.use(req, res, () => undefined);

    const id = req.requestId;
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(res.getHeader('X-Request-ID')).toBe(id);
  });

  it('should reuse x-request-id header if provided', () => {
    const req = mockReq({ 'x-request-id': 'custom-id' });
    const res = mockRes();

    middleware.use(req, res, () => undefined);

    expect(req.requestId).toBe('custom-id');
    expect(res.getHeader('X-Request-ID')).toBe('custom-id');
  });
});
