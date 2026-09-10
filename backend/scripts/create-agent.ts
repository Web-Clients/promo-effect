/**
 * Create one real Chinese agent account, through the same service the admin
 * screen uses — never by writing rows directly, so the user, the agent profile
 * and the generated agent code stay consistent with what the UI would produce.
 *
 * Usage (on the server, from backend/):
 *   AGENT_JSON='{"email":"...","company":"...","contactName":"...",
 *                "phone":"...","wechatId":"..."}' npx tsx scripts/create-agent.ts
 *
 * The password is generated here and printed exactly once. It is not a seed
 * value and is not stored anywhere else — hand it over and have the agent
 * change it on first login.
 *
 * Refuses to touch an email that already exists: re-running must never reset
 * someone's password or overwrite a profile.
 */
import { randomBytes } from 'crypto';
import prisma from '../src/lib/prisma';
import { agentsService } from '../src/modules/agents/agents.service';

function generatePassword(): string {
  // 16 characters from an unambiguous alphabet: no 0/O, 1/l/I, so it survives
  // being read aloud over a phone or retyped from a WeChat message.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) out += alphabet[bytes[i] % alphabet.length];
  // Guarantee the mixture the password policy expects.
  return `${out.slice(0, 13)}-${Math.floor(10 + (bytes[0] % 90))}`;
}

async function main() {
  const raw = process.env.AGENT_JSON;
  if (!raw) throw new Error('AGENT_JSON is required.');
  const input = JSON.parse(raw) as {
    email: string;
    company: string;
    contactName: string;
    phone?: string;
    wechatId?: string;
  };

  for (const field of ['email', 'company', 'contactName'] as const) {
    if (!input[field]?.trim()) throw new Error(`Missing ${field}.`);
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error(
      `${input.email} already has an account (role ${existing.role}). Nothing changed.`
    );
  }

  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) throw new Error('No admin user to record as creator.');

  const password = generatePassword();
  const agent = await agentsService.createAgent(
    {
      email: input.email.trim(),
      password,
      name: input.contactName.trim(),
      phone: input.phone?.trim(),
      company: input.company.trim(),
      contactName: input.contactName.trim(),
      wechatId: input.wechatId?.trim(),
    },
    admin.id
  );

  console.log('AGENT CREATED');
  console.log(`  code     ${agent.agentCode}`);
  console.log(`  company  ${agent.company}`);
  console.log(`  login    ${agent.user.email}`);
  console.log(`  password ${password}`);
}

main()
  .catch((e) => {
    console.error(String(e instanceof Error ? e.message : e));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
