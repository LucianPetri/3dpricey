/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireObject, requireString, validateBody } from '../middleware/validation.middleware';
import { parseEmbroideryFileController } from '../controllers/embroidery.controller';

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/parse-file',
  validateBody([requireObject(), requireString('fileName'), requireString('fileContent')]),
  parseEmbroideryFileController
);

export default router;