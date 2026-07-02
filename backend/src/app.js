import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import publicMenuRoutes from './routes/public-menu.js';
import orderRoutes from './routes/orders.js';
import { notFound, errorHandler } from './middlewares/error-handler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_URL ?? true }));
  app.use(express.json());

  app.use('/api', healthRoutes);
  app.use('/api/public', publicMenuRoutes);
  app.use('/api/public', orderRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
