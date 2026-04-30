/**
 * One-time backfill script: encrypt existing plaintext sensitive data in DB.
 *
 * Fields encrypted:
 * - clients.bankAccount
 * - users.phone
 * - bookings.supplierEmail
 * - adminSettings.gmailAccessToken, gmailRefreshToken
 *
 * Safe to run multiple times — already-encrypted values (prefix "enc:v1:") are skipped.
 *
 * Usage:
 *   ENCRYPTION_KEY=<64-hex-chars> npx ts-node scripts/backfill-encryption.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { encrypt, isEncrypted, validateEncryptionKey } from '../src/utils/crypto.util';

const prisma = new PrismaClient();

async function backfill() {
  // Validate key before touching any data
  validateEncryptionKey();
  console.log('[backfill] ENCRYPTION_KEY validated.');

  let total = 0;
  let skipped = 0;
  let encrypted = 0;

  // ── 1. clients.bankAccount ───────────────────────────────────────────────
  console.log('\n[backfill] Processing clients.bankAccount...');
  const clients = await prisma.client.findMany({
    select: { id: true, bankAccount: true },
  });
  for (const c of clients) {
    total++;
    if (!c.bankAccount || isEncrypted(c.bankAccount)) { skipped++; continue; }
    await prisma.client.update({
      where: { id: c.id },
      data: { bankAccount: encrypt(c.bankAccount) } as any,
    });
    encrypted++;
  }
  console.log(`  → ${encrypted} encrypted, ${skipped} skipped (already encrypted or null)`);

  // ── 2. users.phone ───────────────────────────────────────────────────────
  console.log('\n[backfill] Processing users.phone...');
  encrypted = 0; skipped = 0;
  const users = await prisma.user.findMany({
    select: { id: true, phone: true },
  });
  for (const u of users) {
    total++;
    if (!u.phone || isEncrypted(u.phone)) { skipped++; continue; }
    await prisma.user.update({
      where: { id: u.id },
      data: { phone: encrypt(u.phone) },
    });
    encrypted++;
  }
  console.log(`  → ${encrypted} encrypted, ${skipped} skipped`);

  // ── 3. bookings.supplierEmail ────────────────────────────────────────────
  console.log('\n[backfill] Processing bookings.supplierEmail...');
  encrypted = 0; skipped = 0;
  const bookings = await prisma.booking.findMany({
    select: { id: true, supplierEmail: true },
  });
  for (const b of bookings) {
    total++;
    const email = (b as any).supplierEmail as string | null;
    if (!email || isEncrypted(email)) { skipped++; continue; }
    await prisma.booking.update({
      where: { id: b.id },
      data: { supplierEmail: encrypt(email) } as any,
    });
    encrypted++;
  }
  console.log(`  → ${encrypted} encrypted, ${skipped} skipped`);

  // ── 4. adminSettings gmail tokens ────────────────────────────────────────
  console.log('\n[backfill] Processing adminSettings gmail tokens...');
  encrypted = 0; skipped = 0;
  const settings = await prisma.adminSettings.findUnique({ where: { id: 1 } });
  if (settings) {
    const s = settings as any;
    const updateData: any = {};
    if (s.gmailAccessToken && !isEncrypted(s.gmailAccessToken)) {
      updateData.gmailAccessToken = encrypt(s.gmailAccessToken);
      encrypted++;
    } else { skipped++; }
    if (s.gmailRefreshToken && !isEncrypted(s.gmailRefreshToken)) {
      updateData.gmailRefreshToken = encrypt(s.gmailRefreshToken);
      encrypted++;
    } else { skipped++; }
    if (Object.keys(updateData).length > 0) {
      await prisma.adminSettings.update({ where: { id: 1 }, data: updateData });
    }
    total += 2;
  }
  console.log(`  → ${encrypted} encrypted, ${skipped} skipped`);

  console.log(`\n[backfill] Done. Total records inspected: ${total}`);
}

backfill()
  .catch((e) => { console.error('[backfill] Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
