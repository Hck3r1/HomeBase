-- PostGIS geography column for proximity search
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS geo geography(Point, 4326);

UPDATE "Listing" SET geo = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;

CREATE OR REPLACE FUNCTION listing_sync_geo() RETURNS trigger AS $$
BEGIN
  NEW.geo := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listing_sync_geo ON "Listing";
CREATE TRIGGER trg_listing_sync_geo
  BEFORE INSERT OR UPDATE OF lat, lng ON "Listing"
  FOR EACH ROW EXECUTE FUNCTION listing_sync_geo();

CREATE INDEX IF NOT EXISTS listing_geo_gix ON "Listing" USING GIST (geo);
