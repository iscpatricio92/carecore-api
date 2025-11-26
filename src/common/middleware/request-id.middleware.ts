import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extend Request type to include requestId
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware to add a unique Request ID to each request
 * Useful for traceability and debugging
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Generate or use Request ID from header (if coming from a proxy)
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Add to request for internal use
    req.requestId = requestId;

    // Add to response header
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
