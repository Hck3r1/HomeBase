import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';
import { publicUser } from '../../lib/userPublic';

const userInclude = { preferences: true } as const;

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: userInclude });
    if (!user) throw new ApiError(404, 'User not found');
    res.json(publicUser(user));
  } catch (e) {
    next(e);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, phone, avatarUrl, dateOfBirth, gender } = req.body;
    const existing = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!existing) throw new ApiError(404, 'User not found');

    const advancingProfile =
      !existing.setupCompletedAt && gender !== undefined && gender !== null;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(gender !== undefined && { gender }),
        ...(advancingProfile && { setupStep: 'role' }),
      },
      include: userInclude,
    });
    res.json(publicUser(user));
  } catch (e) {
    next(e);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, listerType } = req.body;
    if (role === 'lister' && !['agent', 'landlord'].includes(listerType)) {
      throw new ApiError(400, 'listerType required for lister');
    }
    const existing = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!existing) throw new ApiError(404, 'User not found');

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        role,
        listerType: role === 'lister' ? listerType : null,
        ...(!existing.setupCompletedAt && { setupStep: 'preferences' }),
      },
      include: userInclude,
    });
    res.json(publicUser(user));
  } catch (e) {
    next(e);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const { listingTypes, budgetMin, budgetMax, preferredCity, bedroomsMin, serviceAreas } = req.body;
    const userId = req.user!.id;
    await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        listingTypes: listingTypes ?? [],
        budgetMin: budgetMin ?? null,
        budgetMax: budgetMax ?? null,
        preferredCity: preferredCity ?? null,
        bedroomsMin: bedroomsMin ?? null,
        serviceAreas: serviceAreas ?? [],
      },
      update: {
        ...(listingTypes !== undefined && { listingTypes }),
        ...(budgetMin !== undefined && { budgetMin }),
        ...(budgetMax !== undefined && { budgetMax }),
        ...(preferredCity !== undefined && { preferredCity }),
        ...(bedroomsMin !== undefined && { bedroomsMin }),
        ...(serviceAreas !== undefined && { serviceAreas }),
      },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
    if (!user) throw new ApiError(404, 'User not found');

    if (!user.setupCompletedAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { setupStep: user.role === 'lister' ? 'kyc' : 'preferences' },
      });
    }

    const refreshed = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
    if (!refreshed) throw new ApiError(404, 'User not found');
    res.json(publicUser(refreshed));
  } catch (e) {
    next(e);
  }
}

export async function completeSetup(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { setupCompletedAt: new Date() },
      include: userInclude,
    });
    res.json(publicUser(user));
  } catch (e) {
    next(e);
  }
}

export async function addPushToken(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.pushToken.upsert({
      where: { token: req.body.token },
      update: { userId: req.user!.id, platform: req.body.platform },
      create: { userId: req.user!.id, token: req.body.token, platform: req.body.platform },
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
}
