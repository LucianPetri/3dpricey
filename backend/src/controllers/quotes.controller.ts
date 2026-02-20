/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export async function getQuotes(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId;
    const { limit = '20', offset = '0', status, customerId } = req.query;

    const where: any = { userId };
    
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        customer: true,
        quoteFilaments: true,
        printJob: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.quote.count({ where });

    res.json({
      quotes,
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
      include: {
        customer: true,
        quoteFilaments: true,
        printJob: {
          include: {
            machine: true,
          },
        },
      },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({ quote });
  } catch (error: any) {
    console.error('Get quote by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
}

export async function createQuote(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId!;
    const quoteData = req.body;

    // Get user's companyId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'User must belong to a company' });
    }

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        ...quoteData,
        userId,
        companyId: user.companyId,
      },
      include: {
        customer: true,
        quoteFilaments: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        quoteId: quote.id,
        action: 'CREATE',
        changes: { quote },
      },
    });

    res.status(201).json({ quote, message: 'Quote created successfully' });
  } catch (error: any) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
}

export async function updateQuote(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId!;
    const { id } = req.params;
    const updateData = req.body;

    // Check if quote exists and belongs to user
    const existingQuote = await prisma.quote.findFirst({
      where: { id, userId },
    });

    if (!existingQuote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Update quote
    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        quoteFilaments: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        quoteId: quote.id,
        action: 'UPDATE',
        changes: {
          before: existingQuote,
          after: quote,
        },
      },
    });

    res.json({ quote, message: 'Quote updated successfully' });
  } catch (error: any) {
    console.error('Update quote error:', error);
    res.status(500).json({ error: 'Failed to update quote' });
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

    // Get user's companyId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'User must belong to a company' });
    }

    // Create quotes in a transaction
    const createdQuotes = await prisma.$transaction(
      quotesData.map((quoteData) =>
        prisma.quote.create({
          data: {
            ...quoteData,
            userId,
            companyId: user.companyId!,
          },
        })
      )
    );

    res.status(201).json({
      quotes: createdQuotes,
      count: createdQuotes.length,
      message: 'Quotes created successfully',
    });
  } catch (error: any) {
    console.error('Batch create quotes error:', error);
    res.status(500).json({ error: 'Failed to create quotes' });
  }
}
