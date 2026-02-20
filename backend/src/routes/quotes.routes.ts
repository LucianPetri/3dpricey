/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  batchCreateQuotes,
} from '../controllers/quotes.controller';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getQuotes);
router.post('/', createQuote);
router.post('/batch', batchCreateQuotes);
router.get('/:id', getQuoteById);
router.put('/:id', updateQuote);
router.delete('/:id', deleteQuote);

export default router;
