import { prisma } from '../../src/lib/prisma';

let listingGeoReady = false;

async function ensureListingGeo() {
  if (listingGeoReady) return;

  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS geo geography(Point, 4326)',
  );
  await prisma.$executeRawUnsafe(
    'UPDATE "Listing" SET geo = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography WHERE geo IS NULL',
  );
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION listing_sync_geo() RETURNS trigger AS $$
    BEGIN
      NEW.geo := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_listing_sync_geo ON "Listing"');
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_listing_sync_geo
      BEFORE INSERT OR UPDATE OF lat, lng ON "Listing"
      FOR EACH ROW EXECUTE FUNCTION listing_sync_geo()
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS listing_geo_gix ON "Listing" USING GIST (geo)',
  );

  listingGeoReady = true;
}

export async function resetDb() {
  await ensureListingGeo();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Review","KycVerification","Message","ConversationParticipant","Conversation","Favorite","ListingPhoto","ListingRentDetails","ListingSaleDetails","ListingShortstayDetails","Listing","PushToken","AuthProvider","UserPreference","User" RESTART IDENTITY CASCADE',
  );
}
