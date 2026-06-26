import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { healthRouter } from './routes/health';
import { notFound, errorHandler } from './middleware/error';
import { generalLimiter, security } from './middleware/security';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';
import { listingsRouter } from './modules/listings/listings.routes';
import { favoritesRouter } from './modules/favorites/favorites.routes';
import { messagingRouter } from './modules/messaging/messaging.routes';
import { reviewsRouter } from './modules/reviews/reviews.routes';
import { mine } from './modules/listings/listings.controller';
import { requireAuth, requireLister } from './middleware/auth';
import { setupSwagger } from './docs/swagger';

export function createApp() {
  const app = express();
  app.use(express.json());
  setupSwagger(app);
  app.use(security);
  app.use(generalLimiter);
  app.use(pinoHttp({ logger }));
  app.use('/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/listings', listingsRouter);
  app.use('/api/v1/favorites', favoritesRouter);
  app.use('/api/v1/conversations', messagingRouter);
  app.use('/api/v1/reviews', reviewsRouter);
  app.get('/api/v1/me/listings', requireAuth, requireLister, mine);
  app.use('/api/v1', usersRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
