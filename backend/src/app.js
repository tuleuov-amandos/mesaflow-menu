import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import publicMenuRoutes from './routes/public-menu.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import { notFound, errorHandler } from './middlewares/error-handler.js';

const STATIC_ALLOWED_ORIGINS = ['https://mesaflow-menu.vercel.app'];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  if (STATIC_ALLOWED_ORIGINS.includes(origin)) return true;
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;
  return false;
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true);
        callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
      },
    }),
  );
  app.use(express.json());

  app.use('/api', healthRoutes);
  app.use('/api/public', publicMenuRoutes);
  app.use('/api/public', orderRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
