import { PrismaClient, RefCategory } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

type SeedRow = {
  category: RefCategory;
  code: string;
  label: string;
  minValue?: number | null;
  maxValue?: number | null;
  sortOrder: number;
};

const OPTIONS: SeedRow[] = [
  // Cities
  { category: 'city', code: 'lagos', label: 'Lagos', sortOrder: 1 },
  { category: 'city', code: 'abuja', label: 'Abuja', sortOrder: 2 },
  { category: 'city', code: 'port_harcourt', label: 'Port Harcourt', sortOrder: 3 },
  { category: 'city', code: 'ibadan', label: 'Ibadan', sortOrder: 4 },
  { category: 'city', code: 'kano', label: 'Kano', sortOrder: 5 },
  { category: 'city', code: 'enugu', label: 'Enugu', sortOrder: 6 },

  // Listing types
  { category: 'listing_type', code: 'rent', label: 'Rent', sortOrder: 1 },
  { category: 'listing_type', code: 'sale', label: 'Buy', sortOrder: 2 },
  { category: 'listing_type', code: 'shortstay', label: 'Short stay', sortOrder: 3 },

  // Seeker monthly budget presets (NGN)
  { category: 'budget_preset_seeker', code: 'under_500k', label: 'Under ₦500K/mo', minValue: 0, maxValue: 500_000, sortOrder: 1 },
  { category: 'budget_preset_seeker', code: '500k_1m', label: '₦500K – ₦1M/mo', minValue: 500_000, maxValue: 1_000_000, sortOrder: 2 },
  { category: 'budget_preset_seeker', code: '1m_2_5m', label: '₦1M – ₦2.5M/mo', minValue: 1_000_000, maxValue: 2_500_000, sortOrder: 3 },
  { category: 'budget_preset_seeker', code: '2_5m_plus', label: '₦2.5M+/mo', minValue: 2_500_000, maxValue: 10_000_000, sortOrder: 4 },

  // Lister price presets (NGN)
  { category: 'budget_preset_lister', code: 'under_1m', label: 'Under ₦1M', minValue: 0, maxValue: 1_000_000, sortOrder: 1 },
  { category: 'budget_preset_lister', code: '1m_5m', label: '₦1M – ₦5M', minValue: 1_000_000, maxValue: 5_000_000, sortOrder: 2 },
  { category: 'budget_preset_lister', code: '5m_20m', label: '₦5M – ₦20M', minValue: 5_000_000, maxValue: 20_000_000, sortOrder: 3 },
  { category: 'budget_preset_lister', code: '20m_plus', label: '₦20M+', minValue: 20_000_000, maxValue: 100_000_000, sortOrder: 4 },

  // Gender
  { category: 'gender', code: 'male', label: 'Male', sortOrder: 1 },
  { category: 'gender', code: 'female', label: 'Female', sortOrder: 2 },
  { category: 'gender', code: 'prefer_not_to_say', label: 'Prefer not to say', sortOrder: 3 },

  // Bedrooms
  { category: 'bedroom', code: '1', label: '1+', minValue: 1, sortOrder: 1 },
  { category: 'bedroom', code: '2', label: '2+', minValue: 2, sortOrder: 2 },
  { category: 'bedroom', code: '3', label: '3+', minValue: 3, sortOrder: 3 },
  { category: 'bedroom', code: '4', label: '4+', minValue: 4, sortOrder: 4 },
  { category: 'bedroom', code: '5', label: '5+', minValue: 5, sortOrder: 5 },
];

export async function seedRefOptions(client: PrismaClient = prisma) {
  for (const row of OPTIONS) {
    await client.refOption.upsert({
      where: { category_code: { category: row.category, code: row.code } },
      create: row,
      update: {
        label: row.label,
        minValue: row.minValue ?? null,
        maxValue: row.maxValue ?? null,
        sortOrder: row.sortOrder,
        active: true,
      },
    });
  }
}

const DEMO_LISTER_EMAIL = 'demo.lister@homebase.test';

export async function seedSampleListings(client: PrismaClient = prisma) {
  const passwordHash = await hashPassword('password1');
  const lister = await client.user.upsert({
    where: { email: DEMO_LISTER_EMAIL },
    create: {
      name: 'Demo Agent',
      email: DEMO_LISTER_EMAIL,
      passwordHash,
      role: 'lister',
      listerType: 'agent',
      setupStep: 'kyc',
      setupCompletedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
    update: {
      role: 'lister',
      listerType: 'agent',
      setupCompletedAt: new Date(),
    },
  });

  const samples = [
    {
      listingType: 'rent' as const,
      title: 'Modern 2-Bed Flat in Yaba',
      description: 'Bright apartment close to tech hubs with parking and 24/7 security.',
      propertyType: 'apartment',
      bedrooms: 2,
      bathrooms: 2,
      amenities: ['parking', 'wifi', 'security'],
      address: '12 Herbert Macaulay Way',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.5095,
      lng: 3.3711,
      photoUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      rent: { monthlyRent: 350_000_00, securityDeposit: 350_000_00, leaseTermMonths: 12 },
    },
    {
      listingType: 'rent' as const,
      title: 'Spacious 3-Bed Duplex in Lekki',
      description: 'Family-friendly duplex with generator, pool access, and fitted kitchen.',
      propertyType: 'house',
      bedrooms: 3,
      bathrooms: 3,
      amenities: ['pool', 'generator', 'parking'],
      address: '15 Admiralty Way',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.4474,
      lng: 3.4700,
      photoUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      rent: { monthlyRent: 1_200_000_00, securityDeposit: 1_200_000_00, leaseTermMonths: 12 },
    },
    {
      listingType: 'sale' as const,
      title: '4-Bed Terrace in Victoria Island',
      description: 'Premium terrace home with sea views and verified title documents.',
      propertyType: 'house',
      bedrooms: 4,
      bathrooms: 4,
      amenities: ['security', 'parking'],
      address: '8 Ahmadu Bello Way',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.4281,
      lng: 3.4219,
      photoUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      sale: { salePrice: 20_000_000_00, negotiable: true, titleDocsVerified: true },
    },
    {
      listingType: 'shortstay' as const,
      title: 'Stylish Studio in Ikoyi',
      description: 'Fully furnished studio ideal for short business stays.',
      propertyType: 'apartment',
      bedrooms: 1,
      bathrooms: 1,
      amenities: ['wifi', 'ac', 'housekeeping'],
      address: '3 Bourdillon Road',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.4541,
      lng: 3.4346,
      photoUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      shortstay: { nightlyRate: 45_000_00, cleaningFee: 5_000_00, minNights: 2, maxNights: 14, maxGuests: 2 },
    },
    {
      listingType: 'rent' as const,
      title: 'Affordable 1-Bed in Surulere',
      description: 'Compact flat perfect for young professionals, close to stadium.',
      propertyType: 'apartment',
      bedrooms: 1,
      bathrooms: 1,
      amenities: ['wifi'],
      address: '22 Adeniran Ogunsanya',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.4969,
      lng: 3.3534,
      photoUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800',
      rent: { monthlyRent: 180_000_00, securityDeposit: 180_000_00, leaseTermMonths: 12 },
    },
  ];

  for (const sample of samples) {
    const { photoUrl, rent, sale, shortstay, listingType, ...base } = sample;
    const existing = await client.listing.findFirst({
      where: { ownerId: lister.id, title: sample.title },
    });
    if (existing) continue;

    await client.listing.create({
      data: {
        ...base,
        ownerId: lister.id,
        listingType,
        status: 'active',
        rent: listingType === 'rent' ? { create: rent! } : undefined,
        sale: listingType === 'sale' ? { create: sale! } : undefined,
        shortstay: listingType === 'shortstay' ? { create: shortstay! } : undefined,
        photos: {
          create: {
            cloudinaryPublicId: `seed/${sample.title.replace(/\s+/g, '-').toLowerCase()}`,
            url: photoUrl,
            position: 0,
          },
        },
      },
    });
  }

  return lister.id;
}

async function main() {
  await seedRefOptions();
  await seedSampleListings();
  console.log(`Seeded ${OPTIONS.length} reference options and sample listings`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
