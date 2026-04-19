/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { prisma } from '../lib/prisma';

type ConnectionStore = {
  findUnique(args: Record<string, unknown>): Promise<Record<string, any> | null>;
  upsert(args: Record<string, unknown>): Promise<Record<string, any>>;
  update(args: Record<string, unknown>): Promise<Record<string, any>>;
};

function getConnectionStore() {
  const store = (prisma as unknown as Record<string, unknown>).printerConnectionState;
  if (!store || typeof store !== 'object') {
    throw new AppError(500, 'Printer connection state model is unavailable');
  }

  return store as ConnectionStore;
}

async function getMachineForUser(userId: string | undefined, machineId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!user?.companyId) {
    throw new AppError(400, 'User must belong to a company');
  }

  const machine = await prisma.machine.findFirst({
    where: {
      id: machineId,
      companyId: user.companyId,
    },
  });

  if (!machine) {
    throw new AppError(404, 'Machine not found');
  }

  return machine;
}

function handleMachineControllerError(res: Response, error: unknown, action: string) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message, details: error.details });
  }

  console.error(`${action} machine error:`, error);
  return res.status(500).json({ error: `Failed to ${action} machine` });
}

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

export async function reconnectMachine(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId;
    const { id } = req.params;
    const { status, connectionType, reconnectError } = req.body as {
      status: string;
      connectionType: string;
      reconnectError?: string | null;
    };

    await getMachineForUser(userId, id);

    const now = new Date();
    const connection = await getConnectionStore().upsert({
      where: { machineId: id },
      create: {
        machineId: id,
        status,
        connectionType,
        reconnectError: reconnectError ?? null,
        lastSeenAt: now,
        lastReconnectAt: now,
      },
      update: {
        status,
        connectionType,
        reconnectError: reconnectError ?? null,
        lastSeenAt: now,
        lastReconnectAt: now,
      },
    });

    res.json({ connection });
  } catch (error: unknown) {
    return handleMachineControllerError(res, error, 'reconnect');
  }
}

export async function assignMachineJob(req: Request, res: Response) {
  try {
    const userId = (req as AuthRequest).userId;
    const { id } = req.params;
    const { jobId, printType } = req.body as { jobId: string; printType: string };

    const machine = await getMachineForUser(userId, id);
    const connectionStore = getConnectionStore();
    const currentConnection = await connectionStore.findUnique({
      where: { machineId: id },
    });

    if (!currentConnection || currentConnection.status !== 'connected') {
      throw new AppError(409, 'Machine is unavailable for assignment');
    }

    if (machine.printType !== printType) {
      throw new AppError(409, `Machine is incompatible with ${printType} jobs`);
    }

    const assignment = await connectionStore.update({
      where: { machineId: id },
      data: {
        assignedJobId: jobId,
        lastSeenAt: new Date(),
      },
    });

    res.json({
      assignment: {
        machineId: id,
        jobId,
        status: assignment.status,
        connectionType: assignment.connectionType,
        assignedJobId: assignment.assignedJobId,
      },
    });
  } catch (error: unknown) {
    return handleMachineControllerError(res, error, 'assign');
  }
}
