/*
 * 3DPricey Backend
 * Copyright (C) 2025 Printel
 * 
 * This is proprietary software. All rights reserved.
 */

import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import quotesRoutes from './routes/quotes.routes';
import materialsRoutes from './routes/materials.routes';
import machinesRoutes from './routes/machines.routes';
import spoolsRoutes from './routes/spools.routes';
import syncRoutes from './routes/sync.routes';
import errorHandler from './middleware/errorHandler.middleware';

dotenv.config();

const app: Application = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/spools', spoolsRoutes);
app.use('/api/sync', syncRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ 3DPricey API server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
