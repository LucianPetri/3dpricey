/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireObject, requireString, validateBody } from '../middleware/validation.middleware';
import {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  batchCreateQuotes,
  parseQuoteGcodeController,
} from '../controllers/quotes.controller';
import { createLaserQuote } from '../controllers/laser.controller';
import { createEmbroideryQuote } from '../controllers/embroidery.controller';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getQuotes);
router.post('/', createQuote);
router.post('/batch', batchCreateQuotes);
router.post('/laser', createLaserQuote);
router.post('/embroidery', createEmbroideryQuote);
router.post('/parse-gcode', validateBody([requireObject(), requireString('gcode')]), parseQuoteGcodeController);
router.get('/:id', getQuoteById);
router.put('/:id', updateQuote);
router.delete('/:id', deleteQuote);

export default router;
