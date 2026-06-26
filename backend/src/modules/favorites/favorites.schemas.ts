import { z } from 'zod';

export const favoriteParamsSchema = z.object({
  params: z.object({ listingId: z.string().uuid() }),
});
