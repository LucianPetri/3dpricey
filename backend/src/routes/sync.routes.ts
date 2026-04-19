/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getSyncStatus,
  resolveSyncConflict,
  syncChanges,
} from '../controllers/sync.controller';
import {
  requireArray,
  requireObject,
  requireOneOf,
  requireString,
  validateBody,
} from '../middleware/validation.middleware';

const router = express.Router();
router.use(authMiddleware);

const validateSyncBatch = validateBody([
  requireObject(),
  requireArray('changes', 1),
  (body) => {
    const changes = Array.isArray((body as Record<string, unknown>)?.changes)
      ? ((body as Record<string, unknown>).changes as unknown[])
      : [];

    for (const [index, change] of changes.entries()) {
      if (!change || typeof change !== 'object' || Array.isArray(change)) {
        return `changes[${index}] must be an object`;
      }

      const candidate = change as Record<string, unknown>;
      if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
        return `changes[${index}].id must be a non-empty string`;
      }

      if (!['create', 'update', 'delete'].includes(String(candidate.type))) {
        return `changes[${index}].type must be one of: create, update, delete`;
      }

      if (!['quote', 'material', 'machine'].includes(String(candidate.resource))) {
        return `changes[${index}].resource must be one of: quote, material, machine`;
      }

      if (typeof candidate.timestamp !== 'number') {
        return `changes[${index}].timestamp must be a number`;
      }

      if (!candidate.data || typeof candidate.data !== 'object' || Array.isArray(candidate.data)) {
        return `changes[${index}].data must be an object`;
      }
    }

    return null;
  },
]);

const validateResolutionPayload = validateBody([
  requireObject(),
  requireString('transactionId'),
  requireOneOf('resolution', ['local', 'server', 'merged']),
]);

router.post('/', validateSyncBatch, syncChanges);
router.post('/resolve', validateResolutionPayload, resolveSyncConflict);
router.get('/status', getSyncStatus);

export default router;
