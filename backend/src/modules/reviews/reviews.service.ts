import { ReviewTargetType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

export async function ratingSummary(targetType: ReviewTargetType, targetId: string) {
  const agg = await prisma.review.aggregate({
    where: { targetType, targetId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return {
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    count: agg._count.rating,
  };
}

export async function createReview(
  reviewerId: string,
  input: { targetType: ReviewTargetType; targetId: string; rating: number; comment?: string },
) {
  if (input.targetType === 'listing') {
    const listing = await prisma.listing.findUnique({ where: { id: input.targetId }, select: { id: true } });
    if (!listing) throw new ApiError(404, 'Listing not found');
  }
  if (input.targetType === 'lister') {
    const lister = await prisma.user.findUnique({
      where: { id: input.targetId },
      select: { id: true, role: true },
    });
    if (!lister) throw new ApiError(404, 'Lister not found');
    if (lister.role !== 'lister') throw new ApiError(400, 'Can only rate listers');
    if (lister.id === reviewerId) throw new ApiError(400, 'Cannot rate yourself');
  }

  const existing = await prisma.review.findUnique({
    where: {
      reviewerId_targetType_targetId: {
        reviewerId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
  });
  if (existing) throw new ApiError(409, 'You have already submitted this review');

  return prisma.review.create({
    data: {
      reviewerId,
      targetType: input.targetType,
      targetId: input.targetId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    },
  });
}

export async function myReviewFor(
  reviewerId: string,
  targetType: ReviewTargetType,
  targetId: string,
) {
  return prisma.review.findUnique({
    where: {
      reviewerId_targetType_targetId: { reviewerId, targetType, targetId },
    },
  });
}
