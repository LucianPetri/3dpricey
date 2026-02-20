/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
} from '../controllers/machines.controller';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getMachines);
router.post('/', createMachine);
router.put('/:id', updateMachine);
router.delete('/:id', deleteMachine);

export default router;
