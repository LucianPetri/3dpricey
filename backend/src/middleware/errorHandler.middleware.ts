/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function createAppError(statusCode: number, message: string, details?: unknown) {
  return new AppError(statusCode, message, details);
}

export default function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  void req;
  void next;
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const statusCode = err.code === 'P2025' ? 404 : 400;
    return res.status(statusCode).json({
      error: err.code === 'P2025' ? 'Resource not found' : 'Database request failed',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
  }

  const genericError = err as Error | undefined;

  return res.status(500).json({
    error: genericError?.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: genericError?.stack }),
  });
}

