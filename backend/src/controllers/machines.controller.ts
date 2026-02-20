/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export async function getMachines(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId;
    const { printType } = req.query;

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    const where: any = {
      companyId: user?.companyId,
    };

    if (printType) where.printType = printType;

    const machines = await prisma.machine.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ machines });
  } catch (error: any) {
    console.error('Get machines error:', error);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
}

export async function createMachine(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId;
    const machineData = req.body;

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'User must belong to a company' });
    }

    const machine = await prisma.machine.create({
      data: {
        ...machineData,
        userId,
        companyId: user.companyId,
      },
    });

    res.status(201).json({ machine, message: 'Machine created successfully' });
  } catch (error: any) {
    console.error('Create machine error:', error);
    res.status(500).json({ error: 'Failed to create machine' });
  }
}

export async function updateMachine(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const machine = await prisma.machine.update({
      where: { id },
      data: updateData,
    });

    res.json({ machine, message: 'Machine updated successfully' });
  } catch (error: any) {
    console.error('Update machine error:', error);
    res.status(500).json({ error: 'Failed to update machine' });
  }
}

export async function deleteMachine(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.machine.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete machine error:', error);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
}
