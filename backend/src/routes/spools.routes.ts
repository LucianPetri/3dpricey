/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

router.post('/', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

export default router;
