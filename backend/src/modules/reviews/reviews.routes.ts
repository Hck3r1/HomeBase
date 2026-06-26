import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createReviewSchema, reviewSummarySchema } from './reviews.schemas';
import * as controller from './reviews.controller';

export const reviewsRouter = Router();

reviewsRouter.get('/summary', validate(reviewSummarySchema), controller.summary);
reviewsRouter.get('/mine', requireAuth, validate(reviewSummarySchema), controller.mine);
reviewsRouter.post('/', requireAuth, validate(createReviewSchema), controller.create);
