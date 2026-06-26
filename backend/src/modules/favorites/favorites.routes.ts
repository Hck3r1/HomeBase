import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { favoriteParamsSchema } from './favorites.schemas';
import * as controller from './favorites.controller';

export const favoritesRouter = Router();

favoritesRouter.get('/', requireAuth, controller.list);
favoritesRouter.post('/:listingId', requireAuth, validate(favoriteParamsSchema), controller.add);
favoritesRouter.delete('/:listingId', requireAuth, validate(favoriteParamsSchema), controller.remove);
