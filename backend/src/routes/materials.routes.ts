/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from '../controllers/materials.controller';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getMaterials);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);

export default router;
