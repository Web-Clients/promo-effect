/**
 * Prisma Seed Script
 * Populează baza de date cu date de test pentru dezvoltare
 * 
 * Rulare: npx prisma db seed
 * sau: npm run seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================
  // 1. USERS (Utilizatori)
  // ============================================
  console.log('📝 Creating users...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const operatorPassword = await bcrypt.hash('operator123', 10);
  const clientPassword = await bcrypt.hash('client123', 10);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@promo-efect.md' },
    update: {},
    create: {
      email: 'admin@promo-efect.md',
      passwordHash: adminPassword,
      name: 'Ion Admin',
      phone: '+373 123 456 789',
      company: 'Promo-Efect SRL',
      role: 'ADMIN',
      emailVerified: true,
      language: 'ro' as any,
      timezone: 'Europe/Chisinau' as any,
      notificationPreferences: JSON.stringify({
        email: true,
        sms: true,
        whatsapp: false,
        push: true,
      }) as any,
    } as any,
  });
  console.log('✅ Admin user:', admin.email);

  // Operator user
  const operator = await prisma.user.upsert({
    where: { email: 'operator@promo-efect.md' },
    update: {},
    create: {
      email: 'operator@promo-efect.md',
      passwordHash: operatorPassword,
      name: 'Maria Operator',
      phone: '+373 123 456 790',
      company: 'Promo-Efect SRL',
      role: 'OPERATOR',
      emailVerified: true,
      language: 'ro' as any,
    } as any,
  });
  console.log('✅ Operator user:', operator.email);

  // Client user
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@test.md' },
    update: {},
    create: {
      email: 'client@test.md',
      passwordHash: clientPassword,
      name: 'Ion Popescu',
      phone: '+373 123 456 791',
      company: 'Import SRL',
      role: 'CLIENT',
      emailVerified: true,
      language: 'ro' as any,
    } as any,
  });
  console.log('✅ Client user:', clientUser.email);

  // ============================================
  // 2. CLIENTS (Clienți)
  // ============================================
  console.log('\n🏢 Creating clients...');

  const client1 = await prisma.client.upsert({
    where: { email: 'contact@import-srl.md' },
    update: {},
    create: {
      companyName: 'Import SRL',
      contactPerson: 'Ion Popescu',
      email: 'contact@import-srl.md',
      phone: '+373 123 456 791',
      address: 'Chișinău, str. Independenței 1',
      taxId: '1234567890123',
      bankAccount: 'MD24AG000225100013104168',
      paymentTerms: 30 as any,
      creditLimit: 50000 as any,
      currentBalance: 0 as any,
      discount: 5 as any,
      rating: 5.0 as any,
      status: 'ACTIVE',
    } as any,
  });
  console.log('✅ Client:', client1.companyName);

  const client2 = await prisma.client.upsert({
    where: { email: 'info@techmold.md' },
    update: {},
    create: {
      companyName: 'TechMold SA',
      contactPerson: 'Maria Ionescu',
      email: 'info@techmold.md',
      phone: '+373 123 456 792',
      address: 'Chișinău, bd. Ștefan cel Mare 1',
      taxId: '9876543210987',
      paymentTerms: 14 as any,
      creditLimit: 100000 as any,
      currentBalance: 0 as any,
      discount: 10 as any,
      rating: 4.8 as any,
      status: 'ACTIVE',
    } as any,
  });
  console.log('✅ Client:', client2.companyName);

  const client3 = await prisma.client.upsert({
    where: { email: 'office@eastwest.md' },
    update: {},
    create: {
      companyName: 'East-West Trade',
      contactPerson: 'Andrei Vasile',
      email: 'office@eastwest.md',
      phone: '+373 123 456 793',
      address: 'Chișinău, str. Columna 5',
      taxId: '5555555555555',
      paymentTerms: 60 as any,
      creditLimit: 25000 as any,
      currentBalance: 0 as any,
      discount: 0 as any,
      rating: 4.5 as any,
      status: 'ACTIVE',
    } as any,
  });
  console.log('✅ Client:', client3.companyName);

  // ============================================
  // 3. PRICING RULES (Reguli de Prețuri)
  // ============================================
  console.log('\n💰 Creating pricing rules...');

  const pricingRules = [
    {
      name: 'Default Rule - Shanghai to Constanta 40ft',
      priority: 10,
      containerType: '40ft',
      portOrigin: 'Shanghai',
      portDestination: 'Constanta',
      shippingLine: null,
      basePrice: 1500,
      currency: 'USD',
      additionalTaxes: JSON.stringify([
        { name: 'Port Fees', amount: 200, type: 'fixed' },
        { name: 'Customs Estimate', amount: 150, type: 'fixed' },
      ]),
      volumeDiscounts: JSON.stringify([
        { minQuantity: 5, discountPercent: 5 },
        { minQuantity: 10, discountPercent: 10 },
        { minQuantity: 20, discountPercent: 15 },
      ]),
      validFrom: new Date('2025-01-01'),
      validTo: null,
      status: 'ACTIVE',
      createdBy: admin.id,
    },
    {
      name: 'Default Rule - Ningbo to Constanta 40ft',
      priority: 10,
      containerType: '40ft',
      portOrigin: 'Ningbo',
      portDestination: 'Constanta',
      shippingLine: null,
      basePrice: 1550,
      currency: 'USD',
      additionalTaxes: JSON.stringify([
        { name: 'Port Fees', amount: 200, type: 'fixed' },
        { name: 'Customs Estimate', amount: 150, type: 'fixed' },
      ]),
      volumeDiscounts: JSON.stringify([
        { minQuantity: 5, discountPercent: 5 },
        { minQuantity: 10, discountPercent: 10 },
      ]),
      validFrom: new Date('2025-01-01'),
      validTo: null,
      status: 'ACTIVE',
      createdBy: admin.id,
    },
    {
      name: 'Default Rule - Qingdao to Constanta 40ft',
      priority: 10,
      containerType: '40ft',
      portOrigin: 'Qingdao',
      portDestination: 'Constanta',
      shippingLine: null,
      basePrice: 1600,
      currency: 'USD',
      additionalTaxes: JSON.stringify([
        { name: 'Port Fees', amount: 200, type: 'fixed' },
        { name: 'Customs Estimate', amount: 150, type: 'fixed' },
      ]),
      validFrom: new Date('2025-01-01'),
      validTo: null,
      status: 'ACTIVE',
      createdBy: admin.id,
    },
    {
      name: 'Default Rule - Shanghai to Constanta 20ft',
      priority: 10,
      containerType: '20ft',
      portOrigin: 'Shanghai',
      portDestination: 'Constanta',
      shippingLine: null,
      basePrice: 1200,
      currency: 'USD',
      additionalTaxes: JSON.stringify([
        { name: 'Port Fees', amount: 150, type: 'fixed' },
        { name: 'Customs Estimate', amount: 100, type: 'fixed' },
      ]),
      validFrom: new Date('2025-01-01'),
      validTo: null,
      status: 'ACTIVE',
      createdBy: admin.id,
    },
    {
      name: 'MSC Special - Shanghai to Constanta',
      priority: 20,
      containerType: '40ft',
      portOrigin: 'Shanghai',
      portDestination: 'Constanta',
      shippingLine: 'MSC',
      basePrice: 1450,
      currency: 'USD',
      additionalTaxes: JSON.stringify([
        { name: 'Port Fees', amount: 200, type: 'fixed' },
      ]),
      validFrom: new Date('2025-01-01'),
      validTo: null,
      status: 'ACTIVE',
      createdBy: admin.id,
    },
  ];

  for (const rule of pricingRules) {
    const existing = await (prisma as any).pricingRule.findFirst({
      where: {
        name: rule.name,
      },
    });

    if (!existing) {
      await (prisma as any).pricingRule.create({
        data: rule,
      });
      console.log(`✅ Pricing rule: ${rule.name}`);
    } else {
      console.log(`⏭️  Skipping: ${rule.name} (already exists)`);
    }
  }

  // ============================================
  // 4. ADMIN SETTINGS
  // ============================================
  console.log('\n⚙️  Creating admin settings...');

  const adminSettings = await prisma.adminSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      portTaxes: 221.67,
      customsTaxes: 150.0,
      terrestrialTransport: 600.0,
      commission: 200.0,
    },
  });
  console.log('✅ Admin settings created');

  // ============================================
  // 5. SETTINGS (System Settings)
  // ============================================
  console.log('\n🔧 Creating system settings...');

  const settings = [
    {
      category: 'EMAIL',
      key: 'FORWARD_ADDRESS',
      value: JSON.stringify({
        address: 'containers@promo-efect.app',
        token: 'test-token-123',
        createdAt: new Date().toISOString(),
      }),
      type: 'JSON',
      description: 'Email forwarding address for automatic container processing',
    },
    {
      category: 'NOTIFICATIONS',
      key: 'EMAIL_ENABLED',
      value: 'true',
      type: 'BOOLEAN',
      description: 'Enable email notifications',
    },
    {
      category: 'NOTIFICATIONS',
      key: 'SMS_ENABLED',
      value: 'false',
      type: 'BOOLEAN',
      description: 'Enable SMS notifications',
    },
    {
      category: 'TRACKING',
      key: 'AUTO_SYNC_INTERVAL',
      value: '30',
      type: 'NUMBER',
      description: 'Auto sync interval in minutes',
    },
  ];

  for (const setting of settings) {
    const existing = await (prisma as any).setting.findUnique({
      where: {
        category_key: {
          category: setting.category,
          key: setting.key,
        },
      },
    });

    if (!existing) {
      await (prisma as any).setting.create({
        data: setting,
      });
      console.log(`✅ Setting: ${setting.category}.${setting.key}`);
    } else {
      console.log(`⏭️  Skipping: ${setting.category}.${setting.key} (already exists)`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('✅ SEED COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(50));
  console.log('\n📋 Test Accounts:');
  console.log('   Admin:    admin@promo-efect.md / admin123');
  console.log('   Operator: operator@promo-efect.md / operator123');
  console.log('   Client:   client@test.md / client123');
  console.log('\n💡 You can now test registration and login!');
  console.log('='.repeat(50) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

