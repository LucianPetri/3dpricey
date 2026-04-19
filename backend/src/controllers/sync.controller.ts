/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { syncService, SyncChangeInput } from '../services/sync.service';

export async function syncChanges(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;
    if (!userId) {
      throw new AppError(401, 'Authentication is required to sync changes');
    }

    const result = await syncService.processChanges(userId, req.body.changes as SyncChangeInput[]);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function resolveSyncConflict(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;
    if (!userId) {
      throw new AppError(401, 'Authentication is required to resolve sync conflicts');
    }

    const { transactionId, resolution, mergedValue } = req.body as {
      transactionId: string;
      resolution: 'local' | 'server' | 'merged';
      mergedValue?: Record<string, unknown>;
    };

    const result = await syncService.resolveConflict(userId, transactionId, resolution, mergedValue);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getSyncStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).userId;
    if (!userId) {
      throw new AppError(401, 'Authentication is required to view sync status');
    }

    const result = await syncService.getStatus(userId);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
