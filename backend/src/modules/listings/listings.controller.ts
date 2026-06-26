import { Request, Response, NextFunction } from 'express';
import { signUploadParams } from '../../lib/cloudinary';
import { ApiError } from '../../middleware/error';
import * as service from './listings.service';
import { nearbySchema, searchSchema } from './listings.schemas';

export const create = (req: Request, res: Response, next: NextFunction) =>
  service.createListing(req.user!.id, req.body).then((l) => res.status(201).json(l)).catch(next);

export const getOne = (req: Request, res: Response, next: NextFunction) =>
  service.getListing(req.params.id).then((l) => res.json(l)).catch(next);

export const update = (req: Request, res: Response, next: NextFunction) =>
  service.updateListing(req.params.id, req.user!.id, req.body).then((l) => res.json(l)).catch(next);

export const setStatus = (req: Request, res: Response, next: NextFunction) =>
  service.setStatus(req.params.id, req.user!.id, req.body.status).then((l) => res.json(l)).catch(next);

export const remove = (req: Request, res: Response, next: NextFunction) =>
  service.deleteListing(req.params.id, req.user!.id).then(() => res.status(204).send()).catch(next);

export const mine = (req: Request, res: Response, next: NextFunction) =>
  service.myListings(req.user!.id).then((l) => res.json({ data: l })).catch(next);

export const search = (req: Request, res: Response, next: NextFunction) => {
  const parsed = searchSchema.safeParse({ query: req.query });
  if (!parsed.success) {
    return next(new ApiError(400, parsed.error.issues.map((i) => i.message).join('; ')));
  }
  return service.searchListings(parsed.data.query).then((r) => res.json(r)).catch(next);
};

export const nearby = (req: Request, res: Response, next: NextFunction) => {
  const parsed = nearbySchema.safeParse({ query: req.query });
  if (!parsed.success) {
    return next(new ApiError(400, parsed.error.issues.map((i) => i.message).join('; ')));
  }
  return service.nearbyListings(parsed.data.query).then((r) => res.json(r)).catch(next);
};

export const addPhoto = (req: Request, res: Response, next: NextFunction) =>
  service.addPhoto(req.params.id, req.user!.id, req.body).then((p) => res.status(201).json(p)).catch(next);

export const removePhoto = (req: Request, res: Response, next: NextFunction) =>
  service.removePhoto(req.params.id, req.params.photoId, req.user!.id).then(() => res.status(204).send()).catch(next);

export const uploadSignature = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(signUploadParams(`listings/${req.params.id}`));
  } catch {
    next(new ApiError(503, 'Photo upload is not configured on the server.'));
  }
};
