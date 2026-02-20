/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 */

import express from 'express';
import { register, login, refreshToken, getProfile } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/profile', authMiddleware, getProfile);

export default router;
