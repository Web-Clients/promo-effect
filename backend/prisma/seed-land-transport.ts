/**
 * Seed: Land Transport Rates (IMPORT + EXPORT)
 * Official pricing matrix — USD per truck, by weight interval (metric tons)
 *
 * IMPORT = Port (Constanța/Odessa) → Moldova destination
 * EXPORT = Moldova origin → Port
 *
 * Weight intervals: <23 mt, 23-24, 24-25, 25-26, 26-27, 27-28
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const WEIGHT_RANGES = [
  { label: '<23 mt', min: 0, max: 23 },
  { label: '23-24 mt', min: 23, max: 24 },
  { label: '24-25 mt', min: 24, max: 25 },
  { label: '25-26 mt', min: 25, max: 26 },
  { label: '26-27 mt', min: 26, max: 27 },
  { label: '27-28 mt', min: 27, max: 28 },
];

// IMPORT: Port → Moldova destination city (USD per truck)
// Columns: <23 | 23-24 | 24-25 | 25-26 | 26-27 | 27-28
const IMPORT_RATES: Record<string, number[]> = {
  Chișinău: [1550, 1650, 1700, 1800, 1950, 2050],
  Bălți: [1700, 1800, 1900, 2000, 2150, 2250],
  Edineț: [1750, 1850, 1950, 2050, 2200, 2300],
  Soroca: [1750, 1850, 1950, 2000, 2150, 2250],
  Orhei: [1600, 1700, 1750, 1850, 2000, 2200],
  Comrat: [1550, 1650, 1700, 1800, 1900, 2000], // through Leușeni
  Vulcănești: [1500, 1600, 1650, 1750, 1900, 2000], // through Leușeni
  Tiraspol: [1700, 1800, 1850, 1900, 2050, 2150],
  Taraclia: [1500, 1600, 1650, 1750, 1850, 1950],
  Ungheni: [1550, 1650, 1700, 1800, 1900, 2000],
  Căușeni: [1550, 1650, 1750, 1850, 1950, 2050],
};

// EXPORT: Moldova origin city → Port (USD per truck)
// Columns: <23 | 23-24 | 24-25 | 25-26 | 26-27 | 27-28
const EXPORT_RATES: Record<string, number[]> = {
  Chișinău: [1100, 1250, 1300, 1400, 1500, 1650],
  Bălți: [1250, 1350, 1500, 1550, 1650, 1800],
  Edineț: [1400, 1500, 1650, 1700, 1800, 1850],
  Soroca: [1400, 1500, 1650, 1700, 1800, 1850],
  Orhei: [1200, 1250, 1400, 1500, 1600, 1750],
  Comrat: [1200, 1300, 1400, 1500, 1550, 1750], // through Leușeni
  Vulcănești: [1150, 1250, 1350, 1450, 1550, 1700], // through Leușeni
  Tiraspol: [1400, 1500, 1650, 1700, 1800, 1850],
  Căușeni: [1200, 1300, 1400, 1500, 1600, 1700],
};

const ROUTE_NOTES: Record<string, string> = {
  Comrat: 'through Leușeni',
  Vulcănești: 'through Leușeni',
};

async function seedDirection(direction: string, rates: Record<string, number[]>) {
  let upserted = 0;
  for (const [city, prices] of Object.entries(rates)) {
    for (let i = 0; i < WEIGHT_RANGES.length; i++) {
      const wr = WEIGHT_RANGES[i];
      await prisma.landTransportRate.upsert({
        where: {
          direction_city_weightMin_weightMax: {
            direction,
            city,
            weightMin: wr.min,
            weightMax: wr.max,
          },
        },
        update: {
          priceUSD: prices[i],
          weightLabel: wr.label,
          notes: ROUTE_NOTES[city] ?? null,
          active: true,
        },
        create: {
          direction,
          city,
          weightMin: wr.min,
          weightMax: wr.max,
          weightLabel: wr.label,
          priceUSD: prices[i],
          notes: ROUTE_NOTES[city] ?? null,
          active: true,
        },
      });
      upserted++;
    }
  }
  return upserted;
}

async function main() {
  console.log('Seeding land transport rates...');

  const importCount = await seedDirection('IMPORT', IMPORT_RATES);
  console.log(
    `  IMPORT: ${importCount} rows upserted (${Object.keys(IMPORT_RATES).length} cities × 6 weight ranges)`
  );

  const exportCount = await seedDirection('EXPORT', EXPORT_RATES);
  console.log(
    `  EXPORT: ${exportCount} rows upserted (${Object.keys(EXPORT_RATES).length} cities × 6 weight ranges)`
  );

  const total = await prisma.landTransportRate.count();
  console.log(`Done. Total rows in land_transport_rates: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
