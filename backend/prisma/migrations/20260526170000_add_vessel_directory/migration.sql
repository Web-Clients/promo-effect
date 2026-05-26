-- Vessel identity directory, populated live from AISStream ShipStaticData.
-- Lets the email parser resolve a vessel name to the MMSI the AIS stream uses.

CREATE TABLE "vessel_directory" (
  "mmsi"        TEXT PRIMARY KEY,
  "name"        TEXT,
  "imo"         TEXT,
  "ship_type"   INTEGER,
  "call_sign"   TEXT,
  "destination" TEXT,
  "first_seen"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "vessel_directory_name_idx" ON "vessel_directory"("name");
CREATE INDEX "vessel_directory_imo_idx"  ON "vessel_directory"("imo");
