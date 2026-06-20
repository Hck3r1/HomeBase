import { Request, Response, NextFunction } from 'express';
import { getSetupCatalog } from './catalog.service';

export async function setupOptions(_req: Request, res: Response, next: NextFunction) {
  try {
    const catalog = await getSetupCatalog();
    res.json(catalog);
  } catch (e) {
    next(e);
  }
}
