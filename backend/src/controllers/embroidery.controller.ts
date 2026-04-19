/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.middleware';
import { createQuoteForPrintType } from './quotes.controller';

function estimateStitches(buffer: Buffer) {
  const stitchSection = buffer.subarray(52);
  const countedPairs = Math.floor(stitchSection.length / 2);
  return Math.max(1, countedPairs);
}

function parseEmbroideryBuffer(fileName: string, fileContent: string) {
  const buffer = Buffer.from(fileContent, 'base64');
  if (buffer.length < 52) {
    throw new AppError(400, 'Embroidery file is too small to parse');
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  const header = buffer.toString('ascii', 0, 3);

  if (extension !== 'pes' && header !== 'PES') {
    throw new AppError(400, 'Only PES embroidery payloads are currently supported');
  }

  const designWidth = Math.abs(buffer.readInt16LE(48));
  const designHeight = Math.abs(buffer.readInt16LE(50));
  const stitchCount = estimateStitches(buffer);

  return {
    designWidth,
    designHeight,
    stitchCount,
    estimatedEmbroideryTime: Number((stitchCount / 800).toFixed(2)),
  };
}

export async function createEmbroideryQuote(req: Request, res: Response) {
  return createQuoteForPrintType(req, res, 'Embroidery');
}

export async function parseEmbroideryFileController(req: Request, res: Response) {
  try {
    const { fileName, fileContent } = req.body as {
      fileName: string;
      fileContent: string;
    };

    if (typeof fileName !== 'string' || fileName.trim().length === 0) {
      throw new AppError(400, 'fileName must be a non-empty string');
    }

    if (typeof fileContent !== 'string' || fileContent.trim().length === 0) {
      throw new AppError(400, 'fileContent must be a non-empty string');
    }

    res.json(parseEmbroideryBuffer(fileName, fileContent));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, details: error.details });
    }

    console.error('Parse embroidery file error:', error);
    return res.status(500).json({ error: 'Failed to parse embroidery file' });
  }
}