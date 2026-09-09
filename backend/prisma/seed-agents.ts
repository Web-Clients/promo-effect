/**
 * Chinese forwarding agents, with their own logins and their own rates.
 *
 * Ion returned to this four times in the 8 Sep meeting: four agents to start,
 * room for forty, each with his own login and his own page, and — the part he
 * gave a reason for — none of them able to see another's rates, because
 * otherwise "ei la un moment dat se sună și se reglează".
 *
 * The rates below are deliberately mixed: approved and in force, approved but
 * expired, and awaiting approval. Only the first kind may ever reach a customer
 * quote, and seeding all three is how that stays provable rather than asserted.
 *
 * Run after seed-e2e.ts. Idempotent.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const at = (days: number) => new Date(now + days * DAY);

const PASSWORD = 'Agent2026!';

const AGENTS = [
  {
    code: 'CN-01',
    email: 'copen@promo-efect.md',
    name: 'Chen Wei',
    company: 'Ningbo Copen International Logistics',
    wechat: 'copen_ningbo',
  },
  {
    code: 'CN-02',
    email: 'xinyun@promo-efect.md',
    name: 'Liu Yang',
    company: 'XinYun Shipping Agency',
    wechat: 'xinyun_agency',
  },
  {
    code: 'CN-03',
    email: 'cmg@promo-efect.md',
    name: 'Zhang Min',
    company: 'CMG Freight Forwarding',
    wechat: 'cmg_freight',
  },
  {
    code: 'CN-04',
    email: 'sunrise@promo-efect.md',
    name: 'Wang Lei',
    company: 'Sunrise Ocean Lines',
    wechat: 'sunrise_ocean',
  },
];

/** Rates per agent code: [line, containerType, price, departure, validFrom, validUntil, status] */
const RATES: Record<string, Array<[string, string, number, number, number, number, string]>> = {
  'CN-01': [
    ['CMA CGM', '40HQ', 6400, 15, -2, 22, 'APPROVED'],
    ['CMA CGM', '20DV', 3000, 15, -2, 22, 'APPROVED'],
    ['Evergreen', '40HQ', 6250, 21, -2, 6, 'APPROVED'], // expires in 6 days
  ],
  'CN-02': [
    ['CMA CGM', '40HQ', 6280, 22, -1, 21, 'APPROVED'], // best on this line
    ['Maersk', '40HQ', 6600, 18, -1, 21, 'APPROVED'],
  ],
  'CN-03': [
    ['Evergreen', '40HQ', 6180, 20, -1, 21, 'PENDING'], // cheapest, but unapproved
    ['Cosco', '40HQ', 6520, 25, -1, 21, 'APPROVED'],
  ],
  'CN-04': [
    ['MSC', '40HQ', 5990, 12, -40, -10, 'APPROVED'], // approved but long expired
    ['MSC', '40HQ', 6700, 28, 0, 25, 'APPROVED'],
  ],
};

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
  if (!admin) throw new Error('Run seed-e2e.ts first — no admin user.');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const a of AGENTS) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { name: a.name, role: 'AGENT' },
      create: {
        email: a.email,
        passwordHash,
        name: a.name,
        role: 'AGENT',
        emailVerified: true,
      },
    });

    const agent = await prisma.agent.upsert({
      where: { agentCode: a.code },
      update: { company: a.company, contactName: a.name, wechatId: a.wechat },
      create: {
        userId: user.id,
        agentCode: a.code,
        company: a.company,
        contactName: a.name,
        wechatId: a.wechat,
        createdById: admin.id,
      },
    });

    for (const [line, type, price, dep, from, until, status] of RATES[a.code] ?? []) {
      const exists = await prisma.agentPrice.findFirst({
        where: { agentId: agent.id, shippingLine: line, containerType: type, freightPrice: price },
      });
      if (exists) continue;
      await prisma.agentPrice.create({
        data: {
          agentId: agent.id,
          shippingLine: line,
          portOrigin: 'Ningbo',
          containerType: type,
          weightRange: '23-24',
          freightPrice: price,
          departureDate: at(dep),
          validFrom: at(from),
          validUntil: at(until),
          approvalStatus: status,
          ...(status === 'APPROVED' ? { approvedBy: admin.id, approvedAt: new Date() } : {}),
        },
      });
    }
  }

  const [agents, prices, approved] = await Promise.all([
    prisma.agent.count(),
    prisma.agentPrice.count(),
    prisma.agentPrice.count({ where: { approvalStatus: 'APPROVED' } }),
  ]);
  console.log(
    `agents OK — ${agents} agenți, ${prices} tarife (${approved} aprobate). Parola: ${PASSWORD}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
