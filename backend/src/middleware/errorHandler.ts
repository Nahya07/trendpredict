import { NextFunction, Request, Response } from 'express';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[ERROR]', err?.message ?? err);
  const status = err?.status ?? 500;
  res.status(status).json({
    error: err?.message ?? 'Internal server error',
    // Never leak stack traces to the client outside development.
    ...(process.env.NODE_ENV !== 'production' ? { stack: err?.stack } : {}),
  });
}
