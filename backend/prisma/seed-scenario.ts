/**
 * Live-shipment scenario for the local stack.
 *
 * The reference seed (seed-e2e.ts) only loads tariffs, so the fleet map and the
 * booking detail come up empty and neither can be looked at, let alone improved.
 * This adds three shipments at different points of a China→Constanța voyage,
 * including the case that matters most for the map's honesty: a vessel whose
 * last AIS position is three days old because terrestrial receivers do not
 * reach the middle of the Indian Ocean.
 *
 * Run after seed-e2e.ts. Idempotent.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

// Waypoints along the real Ningbo → Constanța routing.
const SHIPMENTS = [
  {
    id: 'MDPE2026090001',
    mmsi: '477123400',
    vesselName: 'MSC AYDIN',
    imo: '9876543',
    containerNumber: 'MEDU7412589',
    blNumber: 'MEDUKC298446',
    shippingLine: 'MSC',
    // Off Crete — mid-Mediterranean, AIS live.
    lat: 34.62,
    lng: 24.18,
    heading: 302,
    lastSeenAgo: 4 * 60 * 1000, // 4 minutes
    status: 'IN_TRANSIT',
    etaInDays: 6,
    location: 'Marea Mediterană, la sud de Creta',
  },
  {
    id: 'MDPE2026090002',
    mmsi: '477556600',
    vesselName: 'CMA CGM BOUGAINVILLE',
    imo: '9702132',
    containerNumber: 'CMAU8850469',
    blNumber: 'CMDUHAI1234567',
    shippingLine: 'CMA CGM',
    // Mid Indian Ocean — no terrestrial AIS receiver reaches here.
    lat: 6.4,
    lng: 74.9,
    heading: 287,
    lastSeenAgo: 3 * DAY, // deliberately stale
    status: 'IN_TRANSIT',
    etaInDays: 21,
    location: 'Oceanul Indian — în afara acoperirii AIS terestre',
  },
  {
    id: 'MDPE2026090003',
    mmsi: '271043300',
    vesselName: 'MAERSK KOWLOON',
    imo: '9502953',
    containerNumber: 'MRKU8601423',
    blNumber: 'MAEU1234567890',
    shippingLine: 'Maersk',
    // Alongside at Constanța.
    lat: 44.1598,
    lng: 28.6348,
    heading: 0,
    lastSeenAgo: 12 * 60 * 1000,
    status: 'ARRIVED',
    etaInDays: 0,
    location: 'Port Constanța, dana 52',
  },
];

async function main() {
  const client = await prisma.client.findFirst();
  if (!client) throw new Error('Run seed-e2e.ts first — no client in the database.');

  for (const s of SHIPMENTS) {
    const lastSeen = new Date(now - s.lastSeenAgo);

    await prisma.vesselDirectory.upsert({
      where: { mmsi: s.mmsi },
      update: { lastSeen, name: s.vesselName, imo: s.imo },
      create: {
        mmsi: s.mmsi,
        name: s.vesselName,
        imo: s.imo,
        shipType: 70, // cargo
        callSign: 'TEST' + s.mmsi.slice(-2),
        destination: 'ROCND',
        lastSeen,
      },
    });

    await prisma.booking.upsert({
      where: { id: s.id },
      update: { status: s.status },
      create: {
        id: s.id,
        clientId: client.id,
        portOrigin: 'Ningbo',
        portDestination: 'Chișinău',
        portTransit: 'Constanța',
        containerType: '40HQ',
        incoterm: 'FOB',
        cargoCategory: 'General',
        cargoWeight: '23-24',
        cargoReadyDate: new Date(now - 30 * DAY),
        shippingLine: s.shippingLine,
        freightPrice: 6455,
        portTaxes: 520,
        customsTaxes: 180,
        terrestrialTransport: 1550,
        commission: 225,
        totalPrice: 8930,
        blNumber: s.blNumber,
        status: s.status,
      },
    });

    await prisma.container.upsert({
      where: { containerNumber: s.containerNumber },
      update: {
        currentLat: s.lat,
        currentLng: s.lng,
        vesselMmsi: s.mmsi,
        lastSyncAt: lastSeen,
      },
      create: {
        bookingId: s.id,
        containerNumber: s.containerNumber,
        type: '40HQ',
        currentStatus: s.status,
        currentLocation: s.location,
        currentLat: s.lat,
        currentLng: s.lng,
        vesselMmsi: s.mmsi,
        vesselName: s.vesselName,
        vesselImo: s.imo,
        vesselHeading: s.heading,
        eta: new Date(now + s.etaInDays * DAY),
        lastSyncAt: lastSeen,
      },
    });

    const container = await prisma.container.findUnique({
      where: { containerNumber: s.containerNumber },
    });
    if (!container) continue;

    const events = [
      { type: 'GATE_IN', loc: 'Ningbo', days: -32, lat: 29.87, lng: 121.54 },
      { type: 'LOADED', loc: 'Ningbo', days: -30, lat: 29.87, lng: 121.54 },
      { type: 'VESSEL_DEPARTURE', loc: 'Ningbo', days: -29, lat: 29.87, lng: 121.54 },
    ];
    for (const e of events) {
      const exists = await prisma.trackingEvent.findFirst({
        where: { containerId: container.id, eventType: e.type },
      });
      if (exists) continue;
      await prisma.trackingEvent.create({
        data: {
          containerId: container.id,
          eventType: e.type,
          location: e.loc,
          portName: e.loc,
          vessel: s.vesselName,
          latitude: e.lat,
          longitude: e.lng,
          containerStatus: 'IN_TRANSIT',
          source: 'MANUAL_ENTRY',
          eventDate: new Date(now + e.days * DAY),
        },
      });
    }
  }

  const [b, c, v] = await Promise.all([
    prisma.booking.count(),
    prisma.container.count(),
    prisma.vesselDirectory.count(),
  ]);
  console.log(`scenario OK — bookings ${b}, containers ${c}, vessels ${v}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
