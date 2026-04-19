/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireObject, requireString, validateBody } from '../middleware/validation.middleware';
import { parseSvgController } from '../controllers/laser.controller';

const router = express.Router();

router.use(authMiddleware);

router.post('/parse-svg', validateBody([requireObject(), requireString('svgData')]), parseSvgController);

export default router;