import { Request, Response, NextFunction } from 'express';
import * as service from './reviews.service';

export const create = (req: Request, res: Response, next: NextFunction) =>
  service
    .createReview(req.user!.id, req.body)
    .then((review) => res.status(201).json(review))
    .catch(next);

export const summary = (req: Request, res: Response, next: NextFunction) =>
  service
    .ratingSummary(req.query.targetType as 'listing' | 'lister', String(req.query.targetId))
    .then((s) => res.json(s))
    .catch(next);

export const mine = (req: Request, res: Response, next: NextFunction) =>
  service
    .myReviewFor(req.user!.id, req.query.targetType as 'listing' | 'lister', String(req.query.targetId))
    .then((review) => res.json(review))
    .catch(next);
