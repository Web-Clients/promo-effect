/**
 * Seed ShippingLineContainer with common port tax estimates.
 * Admin can adjust values later via the admin UI.
 *
 * Run: npx tsx prisma/seed-shipping-line-containers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const data: {
  shippingLine: string;
  containerType: string;
  portTaxes: number;
  customsTaxes: number;
}[] = [
  // Maersk
  { shippingLine: 'Maersk', containerType: '20DV', portTaxes: 650, customsTaxes: 180 },
  { shippingLine: 'Maersk', containerType: '40DV', portTaxes: 700, customsTaxes: 180 },
  { shippingLine: 'Maersk', containerType: '40HQ', portTaxes: 750, customsTaxes: 180 },
  // MSC
  { shippingLine: 'MSC', containerType: '20DV', portTaxes: 600, customsTaxes: 180 },
  { shippingLine: 'MSC', containerType: '40DV', portTaxes: 650, customsTaxes: 180 },
  { shippingLine: 'MSC', containerType: '40HQ', portTaxes: 700, customsTaxes: 180 },
  // CMA CGM
  { shippingLine: 'CMA CGM', containerType: '20DV', portTaxes: 620, customsTaxes: 180 },
  { shippingLine: 'CMA CGM', containerType: '40DV', portTaxes: 670, customsTaxes: 180 },
  { shippingLine: 'CMA CGM', containerType: '40HQ', portTaxes: 720, customsTaxes: 180 },
  // Hapag-Lloyd
  { shippingLine: 'Hapag-Lloyd', containerType: '20DV', portTaxes: 630, customsTaxes: 180 },
  { shippingLine: 'Hapag-Lloyd', containerType: '40DV', portTaxes: 680, customsTaxes: 180 },
  { shippingLine: 'Hapag-Lloyd', containerType: '40HQ', portTaxes: 730, customsTaxes: 180 },
  // Cosco
  { shippingLine: 'Cosco', containerType: '20DV', portTaxes: 580, customsTaxes: 180 },
  { shippingLine: 'Cosco', containerType: '40DV', portTaxes: 630, customsTaxes: 180 },
  { shippingLine: 'Cosco', containerType: '40HQ', portTaxes: 680, customsTaxes: 180 },
  // Yangming
  { shippingLine: 'Yangming', containerType: '20DV', portTaxes: 570, customsTaxes: 180 },
  { shippingLine: 'Yangming', containerType: '40DV', portTaxes: 620, customsTaxes: 180 },
  { shippingLine: 'Yangming', containerType: '40HQ', portTaxes: 670, customsTaxes: 180 },
  // Zim
  { shippingLine: 'Zim', containerType: '20DV', portTaxes: 590, customsTaxes: 180 },
  { shippingLine: 'Zim', containerType: '40DV', portTaxes: 640, customsTaxes: 180 },
  { shippingLine: 'Zim', containerType: '40HQ', portTaxes: 690, customsTaxes: 180 },
];

async function main() {
  console.log('Seeding ShippingLineContainer...');
  let created = 0;
  let skipped = 0;

  for (const row of data) {
    const existing = await prisma.shippingLineContainer.findUnique({
      where: {
        shippingLine_containerType: {
          shippingLine: row.shippingLine,
          containerType: row.containerType,
        },
      },
    });

    if (existing) {
      console.log(`  SKIP: ${row.shippingLine} × ${row.containerType} (already exists)`);
      skipped++;
    } else {
      await prisma.shippingLineContainer.create({
        data: {
          shippingLine: row.shippingLine,
          containerType: row.containerType,
          portTaxes: row.portTaxes,
          isActive: true,
        },
      });
      console.log(
        `  CREATE: ${row.shippingLine} × ${row.containerType} → portTaxes=${row.portTaxes}`
      );
      created++;
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
