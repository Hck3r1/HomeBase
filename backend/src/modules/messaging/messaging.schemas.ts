import { z } from 'zod';

export const createConversationSchema = z.object({
  body: z.object({ listingId: z.string().uuid() }),
});

export const conversationIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const postMessageSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ body: z.string().min(1).max(4000) }),
});
