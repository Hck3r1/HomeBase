import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    targetType: z.enum(['listing', 'lister']),
    targetId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
  }),
});

export const reviewSummarySchema = z.object({
  query: z.object({
    targetType: z.enum(['listing', 'lister']),
    targetId: z.string().uuid(),
  }),
});
