/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export async function getMaterials(req: Request, res: Response) {
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

    const materials = await prisma.material.findMany({
      where,
      include: {
        spools: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ materials });
  } catch (error: any) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
}

export async function createMaterial(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId;
    const materialData = req.body;

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return res.status(400).json({ error: 'User must belong to a company' });
    }

    const material = await prisma.material.create({
      data: {
        ...materialData,
        userId,
        companyId: user.companyId,
      },
    });

    res.status(201).json({ material, message: 'Material created successfully' });
  } catch (error: any) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
}

export async function updateMaterial(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const material = await prisma.material.update({
      where: { id },
      data: updateData,
    });

    res.json({ material, message: 'Material updated successfully' });
  } catch (error: any) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
}

export async function deleteMaterial(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.material.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
}
