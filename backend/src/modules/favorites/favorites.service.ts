import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

const listingInclude = {
  rent: true,
  sale: true,
  shortstay: true,
  photos: true,
  owner: { select: { id: true, name: true, avatarUrl: true, listerType: true } },
};

export async function addFavorite(userId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  return prisma.favorite.upsert({
    where: { userId_listingId: { userId, listingId } },
    update: {},
    create: { userId, listingId },
  });
}

export async function removeFavorite(userId: string, listingId: string) {
  await prisma.favorite.deleteMany({ where: { userId, listingId } });
}

export async function listFavorites(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { listing: { include: listingInclude } },
  });
}
