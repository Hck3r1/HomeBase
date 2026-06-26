import { Request, Response, NextFunction } from 'express';
import * as service from './messaging.service';
import { getIo, room } from '../../realtime/socket';

export const createConversation = (req: Request, res: Response, next: NextFunction) =>
  service.createConversation(req.user!.id, req.body.listingId).then((c) => res.status(201).json(c)).catch(next);

export const listConversations = (req: Request, res: Response, next: NextFunction) =>
  service.listConversations(req.user!.id).then((items) => res.json(items)).catch(next);

export const getConversation = (req: Request, res: Response, next: NextFunction) =>
  service.getConversation(req.params.id, req.user!.id).then((c) => res.json(c)).catch(next);

export const listMessages = (req: Request, res: Response, next: NextFunction) =>
  service.listMessages(req.params.id, req.user!.id).then((items) => res.json(items)).catch(next);

export const postMessage = (req: Request, res: Response, next: NextFunction) =>
  service
    .postMessage(req.params.id, req.user!.id, req.body.body)
    .then((message) => {
      getIo()?.to(room(req.params.id)).emit('message:new', message);
      res.status(201).json(message);
    })
    .catch(next);
