/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Request, RequestHandler } from 'express';
import { AppError } from './errorHandler.middleware';

export type BodyValidator = (body: unknown, req: Request) => string | null;

function getFieldValue(body: unknown, field: string) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined;
  }

  return (body as Record<string, unknown>)[field];
}

export function validateBody(validators: BodyValidator[]): RequestHandler {
  return (req, res, next) => {
    void res;

    const errors = validators
      .map((validator) => validator(req.body, req))
      .filter((error): error is string => Boolean(error));

    if (errors.length > 0) {
      return next(new AppError(400, 'Validation failed', { errors }));
    }

    return next();
  };
}

export function requireObject(field?: string): BodyValidator {
  return (body) => {
    const value = field ? getFieldValue(body, field) : body;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return field ? `${field} must be an object` : 'request body must be an object';
    }

    return null;
  };
}

export function requireString(field: string): BodyValidator {
  return (body) => {
    const value = getFieldValue(body, field);
    return typeof value === 'string' && value.trim().length > 0
      ? null
      : `${field} must be a non-empty string`;
  };
}

export function requireNumber(field: string): BodyValidator {
  return (body) => {
    const value = getFieldValue(body, field);
    return typeof value === 'number' && Number.isFinite(value)
      ? null
      : `${field} must be a finite number`;
  };
}

export function requireArray(field: string, minimumLength = 0): BodyValidator {
  return (body) => {
    const value = getFieldValue(body, field);
    if (!Array.isArray(value)) {
      return `${field} must be an array`;
    }

    return value.length >= minimumLength
      ? null
      : `${field} must contain at least ${minimumLength} item${minimumLength === 1 ? '' : 's'}`;
  };
}

export function requireOneOf(field: string, values: readonly string[]): BodyValidator {
  return (body) => {
    const value = getFieldValue(body, field);
    return typeof value === 'string' && values.includes(value)
      ? null
      : `${field} must be one of: ${values.join(', ')}`;
  };
}
