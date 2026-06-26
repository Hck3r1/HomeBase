import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';
import { ratingSummary } from '../reviews/reviews.service';
import { notifyNewMessage } from './messaging.push';

const conversationInclude = {
  participants: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          role: true,
          listerType: true,
          phone: true,
          kyc: { select: { status: true, verifiedAt: true } },
        },
      },
    },
  },
  listing: {
    select: {
      id: true,
      title: true,
      listingType: true,
      status: true,
      description: true,
      propertyType: true,
      bedrooms: true,
      bathrooms: true,
      address: true,
      city: true,
      state: true,
      ownerId: true,
      photos: { take: 1, orderBy: { position: 'asc' as const } },
      rent: true,
      sale: true,
      shortstay: true,
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          role: true,
          listerType: true,
          phone: true,
          kyc: { select: { status: true, verifiedAt: true } },
        },
      },
    },
  },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

type RawConversation = Awaited<ReturnType<typeof prisma.conversation.findFirst>> & object;

function mapUserProfile(
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    listerType: string | null;
    phone: string | null;
    kyc: { status: string; verifiedAt: Date | null } | null;
  },
  rating: { average: number | null; count: number },
) {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    listerType: user.listerType,
    phone: user.phone,
    kycStatus: user.kyc?.status ?? 'none',
    kycVerified: user.kyc?.status === 'verified',
    kycVerifiedAt: user.kyc?.verifiedAt?.toISOString() ?? null,
    rating,
  };
}

async function unreadMessageCount(conversationId: string, viewerId: string) {
  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: viewerId },
      readAt: null,
    },
  });
}

async function unreadCountsByConversation(conversationIds: string[], viewerId: string) {
  if (conversationIds.length === 0) return new Map<string, number>();

  const groups = await prisma.message.groupBy({
    by: ['conversationId'],
    where: {
      conversationId: { in: conversationIds },
      senderId: { not: viewerId },
      readAt: null,
    },
    _count: { _all: true },
  });

  return new Map(groups.map((g) => [g.conversationId, g._count._all]));
}

async function enrichConversation(
  conv: NonNullable<RawConversation>,
  viewerId: string,
  unreadCount?: number,
) {
  const listingId = conv.listing.id;
  const ownerId = conv.listing.ownerId;
  const [listingRating, listerRating, resolvedUnreadCount] = await Promise.all([
    ratingSummary('listing', listingId),
    ratingSummary('lister', ownerId),
    unreadCount === undefined ? unreadMessageCount(conv.id, viewerId) : Promise.resolve(unreadCount),
  ]);

  const counterpartyParticipant = conv.participants.find((p) => p.userId !== viewerId);
  const counterparty = counterpartyParticipant
    ? mapUserProfile(counterpartyParticipant.user, listerRating)
    : null;

  return {
    id: conv.id,
    listingId: conv.listingId,
    updatedAt: conv.updatedAt,
    participants: conv.participants.map((p) => ({
      userId: p.userId,
      user: mapUserProfile(p.user, p.userId === ownerId ? listerRating : { average: null, count: 0 }),
    })),
    listing: {
      id: conv.listing.id,
      title: conv.listing.title,
      listingType: conv.listing.listingType,
      status: conv.listing.status,
      description: conv.listing.description,
      propertyType: conv.listing.propertyType,
      bedrooms: conv.listing.bedrooms,
      bathrooms: conv.listing.bathrooms,
      address: conv.listing.address,
      city: conv.listing.city,
      state: conv.listing.state,
      photos: conv.listing.photos,
      rentDetails: conv.listing.rent,
      saleDetails: conv.listing.sale,
      shortstayDetails: conv.listing.shortstay,
      owner: mapUserProfile(conv.listing.owner, listerRating),
      rating: listingRating,
    },
    counterparty,
    messages: conv.messages,
    unreadCount: resolvedUnreadCount,
  };
}

export async function createConversation(userId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, ownerId: true } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.ownerId === userId) throw new ApiError(400, 'Cannot start a conversation on your own listing');
  const otherId = listing.ownerId;

  const existing = await prisma.conversation.findFirst({
    where: {
      listingId,
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherId } } },
      ],
    },
    include: conversationInclude,
  });
  if (existing) return enrichConversation(existing, userId);

  const created = await prisma.conversation.create({
    data: {
      listingId,
      participants: { create: [{ userId }, { userId: otherId }] },
    },
    include: conversationInclude,
  });
  return enrichConversation(created, userId);
}

export async function listConversations(userId: string) {
  const rows = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { updatedAt: 'desc' },
    include: conversationInclude,
  });
  const unreadMap = await unreadCountsByConversation(rows.map((c) => c.id), userId);
  return Promise.all(rows.map((c) => enrichConversation(c, userId, unreadMap.get(c.id) ?? 0)));
}

export async function getConversation(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  const conv = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: conversationInclude,
  });
  return enrichConversation(conv, userId);
}

export async function assertParticipant(conversationId: string, userId: string) {
  const part = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId } });
  if (!part) {
    const exists = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { id: true } });
    throw new ApiError(exists ? 403 : 404, exists ? 'Not a participant' : 'Conversation not found');
  }
}

export async function listMessages(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  return prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
}

export async function postMessage(conversationId: string, userId: string, body: string) {
  await assertParticipant(conversationId, userId);
  const message = await prisma.message.create({ data: { conversationId, senderId: userId, body } });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  void notifyNewMessage(message).catch(() => undefined);
  return message;
}
