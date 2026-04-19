/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { prisma } from '../lib/prisma';
import {
  buildQuoteCreateInput,
  buildQuoteUpdateInput,
  extractQuoteFilamentsFromPayload,
  getQuoteInclude,
  replaceQuoteFilaments,
  syncQuoteTypeData,
  toClientQuote,
} from '../services/quote-extension.service';
import { parseQuoteGcode } from '../services/gcode-parser.service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeQuotePayload(existingQuote: Record<string, unknown>, updateData: Record<string, unknown>) {
  const existingParameters = isRecord(existingQuote.parameters) ? existingQuote.parameters : {};
  const updateParameters = isRecord(updateData.parameters) ? updateData.parameters : {};

  return {
    ...existingQuote,
    ...updateData,
    parameters: {
      ...existingParameters,
      ...updateParameters,
    },
  };
}

function handleQuoteControllerError(res: Response, error: unknown, action: 'create' | 'update' | 'batch create') {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message, details: error.details });
  }

  console.error(`${action} quote error:`, error);
  return res.status(500).json({ error: `Failed to ${action} quote` });
}

async function persistQuoteForUser(userId: string, quoteData: Record<string, unknown>) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!user?.companyId) {
    throw new AppError(400, 'User must belong to a company');
  }

  return prisma.$transaction(async (tx) => {
    const createdQuote = await tx.quote.create({
      data: buildQuoteCreateInput(quoteData, userId, user.companyId!),
    });

    await replaceQuoteFilaments(tx, createdQuote.id, extractQuoteFilamentsFromPayload(quoteData));
    await syncQuoteTypeData(tx as Record<string, unknown>, createdQuote.id, quoteData);

    const hydratedQuote = await tx.quote.findUniqueOrThrow({
      where: { id: createdQuote.id },
      include: getQuoteInclude(),
    });

    await tx.auditLog.create({
      data: {
        userId,
        quoteId: hydratedQuote.id,
        action: 'CREATE',
        changes: { quote: toClientQuote(hydratedQuote) },
      },
    });

    return hydratedQuote;
  });
}

export async function createQuoteForPrintType(req: Request, res: Response, printType: 'Laser' | 'Embroidery') {
  try {
    const userId = (req as AuthRequest).userId!;
    const quote = await persistQuoteForUser(userId, {
      ...(req.body as Record<string, unknown>),
      printType,
    });

    res.status(201).json({ quote: toClientQuote(quote), message: 'Quote created successfully' });
  } catch (error: unknown) {
    return handleQuoteControllerError(res, error, 'create');
  }
}

export async function getQuotes(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId;
    const { limit = '20', offset = '0', status, customerId } = req.query;

    const where: any = { userId };
    
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const quotes = await prisma.quote.findMany({
      where,
      include: getQuoteInclude(),
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.quote.count({ where });

    res.json({
      quotes: quotes.map(toClientQuote),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
}

export async function getQuoteById(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId;
    const { id } = req.params;

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        userId,
      },
      include: getQuoteInclude(),
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({ quote: toClientQuote(quote) });
  } catch (error: any) {
    console.error('Get quote by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
}

export async function createQuote(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId!;
    const quoteData = req.body as Record<string, unknown>;
    const quote = await persistQuoteForUser(userId, quoteData);

    res.status(201).json({ quote: toClientQuote(quote), message: 'Quote created successfully' });
  } catch (error: unknown) {
    return handleQuoteControllerError(res, error, 'create');
  }
}

export async function updateQuote(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId!;
    const { id } = req.params;
    const updateData = req.body as Record<string, unknown>;

    // Check if quote exists and belongs to user
    const existingQuote = await prisma.quote.findFirst({
      where: { id, userId },
      include: getQuoteInclude(),
    });

    if (!existingQuote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = await prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: buildQuoteUpdateInput(updateData),
      });

      if (Array.isArray(updateData.quoteFilaments) || Array.isArray((updateData.parameters as Record<string, unknown> | undefined)?.quoteFilaments) || Array.isArray((updateData.parameters as Record<string, unknown> | undefined)?.toolBreakdown)) {
        await replaceQuoteFilaments(tx, id, extractQuoteFilamentsFromPayload(updateData));
      }

      await syncQuoteTypeData(tx as Record<string, unknown>, id, mergeQuotePayload(existingQuote, updateData));

      const hydratedQuote = await tx.quote.findUniqueOrThrow({
        where: { id },
        include: getQuoteInclude(),
      });

      await tx.auditLog.create({
        data: {
          userId,
          quoteId: hydratedQuote.id,
          action: 'UPDATE',
          changes: {
            before: toClientQuote(existingQuote),
            after: toClientQuote(hydratedQuote),
          },
        },
      });

      return hydratedQuote;
    });

    res.json({ quote: toClientQuote(quote), message: 'Quote updated successfully' });
  } catch (error: unknown) {
    return handleQuoteControllerError(res, error, 'update');
  }
}

export async function deleteQuote(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId!;
    const { id } = req.params;

    // Check if quote exists and belongs to user
    const existingQuote = await prisma.quote.findFirst({
      where: { id, userId },
    });

    if (!existingQuote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Delete quote (cascade will handle related records)
    await prisma.quote.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        changes: { deletedQuote: existingQuote },
      },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete quote error:', error);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
}

export async function batchCreateQuotes(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId!;
    const { quotes: quotesData } = req.body;

    if (!Array.isArray(quotesData) || quotesData.length === 0) {
      return res.status(400).json({ error: 'Invalid quotes data' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      throw new AppError(400, 'User must belong to a company');
    }

    const createdQuotes = await prisma.$transaction(async (tx) => {
      const quotes = [];

      for (const rawQuote of quotesData as Record<string, unknown>[]) {
        const createdQuote = await tx.quote.create({
          data: buildQuoteCreateInput(rawQuote, userId, user.companyId!),
        });

        await replaceQuoteFilaments(tx, createdQuote.id, extractQuoteFilamentsFromPayload(rawQuote));
        await syncQuoteTypeData(tx as Record<string, unknown>, createdQuote.id, rawQuote);

        const hydratedQuote = await tx.quote.findUniqueOrThrow({
          where: { id: createdQuote.id },
          include: getQuoteInclude(),
        });

        quotes.push(hydratedQuote);
      }

      return quotes;
    });

    res.status(201).json({
      quotes: createdQuotes.map(toClientQuote),
      count: createdQuotes.length,
      message: 'Quotes created successfully',
    });
  } catch (error: unknown) {
    return handleQuoteControllerError(res, error, 'batch create');
  }
}

export async function parseQuoteGcodeController(req: Request, res: Response) {
  const { gcode } = req.body as { gcode: string };
  const parsed = parseQuoteGcode(gcode);
  res.json(parsed);
}

