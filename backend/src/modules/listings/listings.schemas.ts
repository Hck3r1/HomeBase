import { z } from 'zod';

const baseListing = {
  title: z.string().min(3),
  description: z.string().min(10),
  propertyType: z.string().min(2),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  areaSqm: z.number().int().positive().optional(),
  amenities: z.array(z.string()).default([]),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
};

export const createListingSchema = z.object({
  body: z.discriminatedUnion('listingType', [
    z.object({
      listingType: z.literal('rent'),
      ...baseListing,
      rent: z.object({
        monthlyRent: z.number().int().positive().optional(),
        annualRent: z.number().int().positive().optional(),
        securityDeposit: z.number().int().min(0).default(0),
        leaseTermMonths: z.number().int().positive().default(12),
        availableFrom: z.string().datetime().optional(),
      }),
    }),
    z.object({
      listingType: z.literal('sale'),
      ...baseListing,
      sale: z.object({
        salePrice: z.number().int().positive(),
        negotiable: z.boolean().default(false),
      }),
    }),
    z.object({
      listingType: z.literal('shortstay'),
      ...baseListing,
      shortstay: z.object({
        nightlyRate: z.number().int().positive(),
        cleaningFee: z.number().int().min(0).default(0),
        minNights: z.number().int().positive().default(1),
        maxNights: z.number().int().positive().default(30),
        maxGuests: z.number().int().positive().default(2),
        houseRules: z.string().optional(),
      }),
    }),
  ]),
});

export const updateListingSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    amenities: z.array(z.string()).optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
  }),
});

export const statusSchema = z.object({
  body: z.object({ status: z.enum(['draft', 'active', 'paused', 'rented', 'sold']) }),
});

export const searchSchema = z.object({
  query: z.object({
    type: z.enum(['rent', 'sale', 'shortstay']).optional(),
    q: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    bedrooms: z.coerce.number().optional(),
    bathrooms: z.coerce.number().optional(),
    propertyType: z.string().optional(),
    amenities: z.string().optional(),
    sort: z.enum(['recent', 'priceAsc', 'priceDesc']).default('recent'),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().max(50).default(20),
    pageSize: z.coerce.number().max(50).optional(),
  }),
});

export const nearbySchema = z.object({
  query: z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius: z.coerce.number().default(5000),
    type: z.enum(['rent', 'sale', 'shortstay']).optional(),
  }),
});

export const photoSchema = z.object({
  body: z.object({
    cloudinaryPublicId: z.string(),
    url: z.string().url(),
    position: z.number().int().optional(),
  }),
});
