import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './users.controller';

export const usersRouter = Router();

const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).optional(),
      phone: z.string().min(7).optional(),
      avatarUrl: z.string().url().optional(),
      dateOfBirth: z.string().nullable().optional(),
      gender: z.enum(['male', 'female', 'prefer_not_to_say']).nullable().optional(),
    })
    .strict(),
});

const roleSchema = z.object({
  body: z.object({
    role: z.enum(['seeker', 'lister']),
    listerType: z.enum(['agent', 'landlord']).optional(),
  }),
});

const preferencesSchema = z.object({
  body: z.object({
    listingTypes: z.array(z.enum(['rent', 'sale', 'shortstay'])).optional(),
    budgetMin: z.number().int().nonnegative().nullable().optional(),
    budgetMax: z.number().int().nonnegative().nullable().optional(),
    preferredCity: z.string().min(2).nullable().optional(),
    bedroomsMin: z.number().int().min(0).max(20).nullable().optional(),
    serviceAreas: z.array(z.string().min(2)).optional(),
  }),
});

const pushSchema = z.object({
  body: z.object({ token: z.string().min(3), platform: z.enum(['ios', 'android']) }),
});

usersRouter.get('/me', requireAuth, controller.me);
usersRouter.patch('/me', requireAuth, validate(updateMeSchema), controller.updateMe);
usersRouter.patch('/me/role', requireAuth, validate(roleSchema), controller.updateRole);
usersRouter.patch('/me/preferences', requireAuth, validate(preferencesSchema), controller.updatePreferences);
usersRouter.post('/me/setup-complete', requireAuth, controller.completeSetup);
usersRouter.post('/me/push-token', requireAuth, validate(pushSchema), controller.addPushToken);
