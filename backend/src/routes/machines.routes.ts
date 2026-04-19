/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireObject, requireString, validateBody } from '../middleware/validation.middleware';
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  reconnectMachine,
  assignMachineJob,
} from '../controllers/machines.controller';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getMachines);
router.post('/', createMachine);
router.post('/:id/reconnect', validateBody([requireObject(), requireString('status'), requireString('connectionType')]), reconnectMachine);
router.post('/:id/assign-job', validateBody([requireObject(), requireString('jobId'), requireString('printType')]), assignMachineJob);
router.put('/:id', updateMachine);
router.delete('/:id', deleteMachine);

export default router;
