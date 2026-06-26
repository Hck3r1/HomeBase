import { Request, Response, NextFunction } from 'express';
import * as service from './favorites.service';

export const add = (req: Request, res: Response, next: NextFunction) =>
  service.addFavorite(req.user!.id, req.params.listingId).then((f) => res.status(201).json(f)).catch(next);

export const remove = (req: Request, res: Response, next: NextFunction) =>
  service.removeFavorite(req.user!.id, req.params.listingId).then(() => res.status(204).send()).catch(next);

export const list = (req: Request, res: Response, next: NextFunction) =>
  service.listFavorites(req.user!.id).then((items) => res.json(items)).catch(next);
