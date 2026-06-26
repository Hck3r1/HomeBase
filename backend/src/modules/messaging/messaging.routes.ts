import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createConversationSchema, conversationIdSchema, postMessageSchema } from './messaging.schemas';
import * as controller from './messaging.controller';

export const messagingRouter = Router();

messagingRouter.get('/', requireAuth, controller.listConversations);
messagingRouter.post('/', requireAuth, validate(createConversationSchema), controller.createConversation);
messagingRouter.get('/:id', requireAuth, validate(conversationIdSchema), controller.getConversation);
messagingRouter.get('/:id/messages', requireAuth, validate(conversationIdSchema), controller.listMessages);
messagingRouter.post('/:id/messages', requireAuth, validate(postMessageSchema), controller.postMessage);
