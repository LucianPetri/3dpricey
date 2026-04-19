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
import laserRoutes from './routes/laser.routes';
import embroideryRoutes from './routes/embroidery.routes';
import spoolsRoutes from './routes/spools.routes';
import syncRoutes from './routes/sync.routes';
import errorHandler from './middleware/errorHandler.middleware';

dotenv.config();

export function createApp() {
  const app: Application = express();

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    void req;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/quotes', quotesRoutes);
  app.use('/api/materials', materialsRoutes);
  app.use('/api/machines', machinesRoutes);
  app.use('/api/laser', laserRoutes);
  app.use('/api/embroidery', embroideryRoutes);
  app.use('/api/spools', spoolsRoutes);
  app.use('/api/sync', syncRoutes);

  app.use(errorHandler);

  return app;
}

const app = createApp();

if (require.main === module) {
  const PORT = process.env.API_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`✅ 3DPricey API server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
