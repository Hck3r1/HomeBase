import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { healthRouter } from './routes/health';
import { notFound, errorHandler } from './middleware/error';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use('/health', healthRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
