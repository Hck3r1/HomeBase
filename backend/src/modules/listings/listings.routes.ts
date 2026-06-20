import { Router } from 'express';
import { requireAuth, requireLister } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as c from './listings.controller';
import {
  createListingSchema,
  updateListingSchema,
  statusSchema,
  searchSchema,
  nearbySchema,
  photoSchema,
} from './listings.schemas';

export const listingsRouter = Router();

listingsRouter.get('/', c.search);
listingsRouter.get('/nearby', c.nearby);
listingsRouter.get('/:id', c.getOne);
listingsRouter.post('/', requireAuth, requireLister, validate(createListingSchema), c.create);
listingsRouter.patch('/:id', requireAuth, requireLister, validate(updateListingSchema), c.update);
listingsRouter.patch('/:id/status', requireAuth, requireLister, validate(statusSchema), c.setStatus);
listingsRouter.delete('/:id', requireAuth, requireLister, c.remove);
listingsRouter.post('/:id/photos/sign', requireAuth, requireLister, c.uploadSignature);
listingsRouter.post('/:id/photos', requireAuth, requireLister, validate(photoSchema), c.addPhoto);
listingsRouter.delete('/:id/photos/:photoId', requireAuth, requireLister, c.removePhoto);
