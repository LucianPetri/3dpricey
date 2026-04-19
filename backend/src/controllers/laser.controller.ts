/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.middleware';
import { createQuoteForPrintType } from './quotes.controller';

function parseSvgLength(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return undefined;
  }

  const numericValue = Number(match[1]);
  if (!Number.isFinite(numericValue)) {
    return undefined;
  }

  const unit = value.slice(match[1].length).trim().toLowerCase();
  if (unit === 'cm') {
    return numericValue * 10;
  }

  if (unit === 'in') {
    return numericValue * 25.4;
  }

  return numericValue;
}

function extractSvgDimensions(svgData: string) {
  const widthAttribute = svgData.match(/\bwidth=["']([^"']+)["']/i)?.[1];
  const heightAttribute = svgData.match(/\bheight=["']([^"']+)["']/i)?.[1];
  const viewBox = svgData.match(/\bviewBox=["']([^"']+)["']/i)?.[1];

  const widthFromAttribute = parseSvgLength(widthAttribute);
  const heightFromAttribute = parseSvgLength(heightAttribute);

  if (widthFromAttribute !== undefined && heightFromAttribute !== undefined) {
    return { widthMm: widthFromAttribute, heightMm: heightFromAttribute };
  }

  if (!viewBox) {
    throw new AppError(400, 'SVG dimensions could not be determined');
  }

  const viewBoxParts = viewBox
    .trim()
    .split(/\s+/)
    .map((part) => Number(part));

  if (viewBoxParts.length !== 4 || viewBoxParts.some((part) => !Number.isFinite(part))) {
    throw new AppError(400, 'SVG viewBox is invalid');
  }

  return {
    widthMm: viewBoxParts[2],
    heightMm: viewBoxParts[3],
  };
}

function countSvgPaths(svgData: string) {
  const matches = svgData.match(/<(path|rect|circle|ellipse|polygon|polyline|line)\b/gi);
  return matches ? matches.length : 0;
}

export async function createLaserQuote(req: Request, res: Response) {
  return createQuoteForPrintType(req, res, 'Laser');
}

export async function parseSvgController(req: Request, res: Response) {
  try {
    const { svgData } = req.body as { svgData: string };
    if (typeof svgData !== 'string' || svgData.trim().length === 0) {
      throw new AppError(400, 'svgData must be a non-empty string');
    }

    const { widthMm, heightMm } = extractSvgDimensions(svgData);
    const pathCount = countSvgPaths(svgData);
    const materialSurfaceArea = Number(((widthMm * heightMm) / 100).toFixed(2));

    res.json({
      widthMm,
      heightMm,
      pathCount,
      materialSurfaceArea,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, details: error.details });
    }

    console.error('Parse SVG error:', error);
    return res.status(500).json({ error: 'Failed to parse svg design' });
  }
}