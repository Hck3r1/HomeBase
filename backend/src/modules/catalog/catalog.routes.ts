import { Router } from 'express';
import * as controller from './catalog.controller';

export const catalogRouter = Router();

catalogRouter.get('/setup-options', controller.setupOptions);
