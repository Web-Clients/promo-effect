/**
 * Minimal e2e seed — mirrors the real prod reference data the client's
 * screenshots came from (base_prices, port matrix, per-line port taxes,
 * land rates, admin settings), so the numbers below are comparable to theirs.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Idempotent: wipe the reference data first so the seed can be re-run.
  await prisma.booking.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.landTransportRate.deleteMany({});
  await prisma.shippingLineContainer.deleteMany({});
  await prisma.portPricingMatrix.deleteMany({});
  await prisma.basePrice.deleteMany({});

  await prisma.adminSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      portTaxesConstanta: 221.67,
      terrestrialTransportConstanta: 600,
      portTaxesOdessa: 200,
      terrestrialTransportOdessa: 550,
      customsTaxes: 180,
      commission: 200,
      insuranceCost: 50,
      profitMarginPercent: 10,
      portTaxes: 221.67,
      terrestrialTransport: 600,
      weightRanges: JSON.stringify([
        { label: '23-24 tone', min: 23, max: 24, enabled: true, freightSurcharge: 0, landSurcharge: 0 },
      ]),
    },
  });

  const validFrom = new Date('2026-07-01');
  const validUntil = new Date('2027-07-15');
  for (const [line, price, days] of [['Maersk', 6455, 60], ['CMA CGM', 6500, 65]] as const) {
    await prisma.basePrice.create({
      data: {
        shippingLine: line, portOrigin: 'Shanghai', portDestination: 'Constanta',
        containerType: '40HQ', basePrice: price, transitDays: days,
        validFrom, validUntil, isActive: true,
      },
    });
  }

  for (const ct of ['40HQ', '20DV']) {
    await prisma.portPricingMatrix.create({
      data: { portName: 'Ningbo', containerType: ct, adjustment: ct === '40HQ' ? 100 : 50 },
    });
    await prisma.portPricingMatrix.create({
      data: { portName: 'Shanghai', containerType: ct, adjustment: 0 },
    });
  }

  for (const [line, taxes] of [['Maersk', 520], ['CMA CGM', 700]] as const) {
    await prisma.shippingLineContainer.create({
      data: { shippingLine: line, containerType: '40HC', portTaxes: taxes, isActive: true },
    });
  }

  await prisma.landTransportRate.create({
    data: {
      direction: 'IMPORT', city: 'Chișinău', weightMin: 23, weightMax: 24,
      weightLabel: '23-24 mt', priceUSD: 1550, active: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'e2e-admin@local.test',
      passwordHash: await bcrypt.hash('E2ePassw0rd!', 10),
      name: 'E2E Admin',
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  await prisma.client.create({
    data: {
      companyName: 'Beneficiar E2E SRL',
      email: 'beneficiar@local.test',
      phone: '+37360000000',
      contactPerson: 'Ion Test',
    },
  });

  console.log('seed OK');
}

main()
  .catch((e) => {
    console.error('SEED FAILED>>>', String(e).slice(0, 1200));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
