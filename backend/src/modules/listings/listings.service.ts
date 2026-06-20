import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middleware/error';

const include = {
  rent: true,
  sale: true,
  shortstay: true,
  photos: { orderBy: { position: 'asc' as const } },
  owner: { select: { id: true, name: true, avatarUrl: true, listerType: true } },
};

export async function createListing(ownerId: string, body: Record<string, unknown>) {
  const { listingType, rent, sale, shortstay, ...base } = body as {
    listingType: 'rent' | 'sale' | 'shortstay';
    rent?: Record<string, unknown>;
    sale?: Record<string, unknown>;
    shortstay?: Record<string, unknown>;
    [key: string]: unknown;
  };

  const listing = await prisma.listing.create({
    data: {
      ...base,
      ownerId,
      listingType,
      rent:
        listingType === 'rent'
          ? {
              create: {
                ...(rent as object),
                availableFrom:
                  rent?.availableFrom != null ? new Date(String(rent.availableFrom)) : null,
              },
            }
          : undefined,
      sale: listingType === 'sale' ? { create: sale as object } : undefined,
      shortstay: listingType === 'shortstay' ? { create: shortstay as object } : undefined,
    },
    include,
  });

  await prisma.$executeRaw`
    UPDATE "Listing"
    SET geo = ST_SetSRID(ST_MakePoint(${listing.lng}, ${listing.lat}), 4326)::geography
    WHERE id = ${listing.id}
  `;

  return listing;
}

export async function getListing(id: string) {
  const listing = await prisma.listing.findUnique({ where: { id }, include });
  if (!listing) throw new ApiError(404, 'Listing not found');
  return listing;
}

async function assertOwner(id: string, ownerId: string) {
  const listing = await prisma.listing.findUnique({ where: { id }, select: { ownerId: true } });
  if (!listing) throw new ApiError(404, 'Listing not found');
  if (listing.ownerId !== ownerId) throw new ApiError(403, 'Not your listing');
}

export async function updateListing(id: string, ownerId: string, data: Record<string, unknown>) {
  await assertOwner(id, ownerId);
  return prisma.listing.update({ where: { id }, data, include });
}

export async function setStatus(id: string, ownerId: string, status: string) {
  await assertOwner(id, ownerId);
  return prisma.listing.update({ where: { id }, data: { status: status as never }, include });
}

export async function deleteListing(id: string, ownerId: string) {
  await assertOwner(id, ownerId);
  await prisma.listing.delete({ where: { id } });
}

export async function myListings(ownerId: string) {
  return prisma.listing.findMany({ where: { ownerId }, include, orderBy: { createdAt: 'desc' } });
}

export async function addPhoto(
  listingId: string,
  ownerId: string,
  data: { cloudinaryPublicId: string; url: string; position?: number },
) {
  await assertOwner(listingId, ownerId);
  return prisma.listingPhoto.create({
    data: { listingId, ...data, position: data.position ?? 0 },
  });
}

export async function removePhoto(listingId: string, photoId: string, ownerId: string) {
  await assertOwner(listingId, ownerId);
  await prisma.listingPhoto.delete({ where: { id: photoId } });
}

function intRange(min?: number, max?: number): { gte?: number; lte?: number } | undefined {
  if (min == null && max == null) return undefined;
  const range: { gte?: number; lte?: number } = {};
  if (min != null) range.gte = min;
  if (max != null) range.lte = max;
  return range;
}

function applyPriceFilter(where: Prisma.ListingWhereInput, q: { type?: string; minPrice?: number; maxPrice?: number }) {
  const range = intRange(q.minPrice, q.maxPrice);
  if (!range) return;

  if (q.type === 'rent') {
    where.rent = {
      is: {
        OR: [{ monthlyRent: range }, { annualRent: range }],
      },
    };
  } else if (q.type === 'sale') {
    where.sale = { is: { salePrice: range } };
  } else if (q.type === 'shortstay') {
    where.shortstay = { is: { nightlyRate: range } };
  } else {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { rent: { is: { OR: [{ monthlyRent: range }, { annualRent: range }] } } },
          { sale: { is: { salePrice: range } } },
          { shortstay: { is: { nightlyRate: range } } },
        ],
      },
    ];
  }
}

function buildOrderBy(q: { sort: string; type?: string }): Prisma.ListingOrderByWithRelationInput {
  if (q.sort === 'priceAsc') {
    if (q.type === 'rent') return { rent: { annualRent: 'asc' } };
    if (q.type === 'sale') return { sale: { salePrice: 'asc' } };
    if (q.type === 'shortstay') return { shortstay: { nightlyRate: 'asc' } };
  }
  if (q.sort === 'priceDesc') {
    if (q.type === 'rent') return { rent: { annualRent: 'desc' } };
    if (q.type === 'sale') return { sale: { salePrice: 'desc' } };
    if (q.type === 'shortstay') return { shortstay: { nightlyRate: 'desc' } };
  }
  return { createdAt: 'desc' };
}

export async function searchListings(q: {
  type?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  amenities?: string;
  sort: string;
  page: number;
  limit?: number;
  pageSize?: number;
}) {
  const pageSize = q.pageSize ?? q.limit ?? 20;
  const where: Prisma.ListingWhereInput = { status: 'active' };
  if (q.type) where.listingType = q.type as Prisma.EnumListingTypeFilter['equals'];
  if (q.propertyType) where.propertyType = q.propertyType;
  if (q.bedrooms) where.bedrooms = { gte: q.bedrooms };
  if (q.bathrooms) where.bathrooms = { gte: q.bathrooms };
  if (q.amenities) where.amenities = { hasEvery: q.amenities.split(',') };
  if (q.q) {
    where.OR = [
      { title: { contains: q.q, mode: 'insensitive' } },
      { city: { contains: q.q, mode: 'insensitive' } },
    ];
  }
  applyPriceFilter(where, q);

  const orderBy = buildOrderBy(q);

  const skip = (q.page - 1) * pageSize;
  const [data, total] = await Promise.all([
    prisma.listing.findMany({ where, include, orderBy, skip, take: pageSize }),
    prisma.listing.count({ where }),
  ]);
  return { data, page: q.page, pageSize, total };
}

export async function nearbyListings(q: {
  lat: number;
  lng: number;
  radius: number;
  type?: string;
}) {
  const typeFilter = q.type ? Prisma.sql`AND "listingType" = ${q.type}::"ListingType"` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ id: string; distance: number }[]>`
    SELECT id, ST_Distance(geo, ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography) AS distance
    FROM "Listing"
    WHERE status = 'active'
      AND ST_DWithin(geo, ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography, ${q.radius})
      ${typeFilter}
    ORDER BY distance ASC
    LIMIT 100`;
  const ids = rows.map((r) => r.id);
  const listings = await prisma.listing.findMany({ where: { id: { in: ids } }, include });
  const byId = new Map(listings.map((l) => [l.id, l]));
  return {
    data: rows
      .map((r) => {
        const listing = byId.get(r.id);
        if (!listing) return null;
        return { ...listing, distanceMeters: Math.round(r.distance) };
      })
      .filter(Boolean),
  };
}
