#!/usr/bin/env tsx
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking invite codes in database...\n');

  const inviteCodes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total invite codes: ${inviteCodes.length}\n`);

  if (inviteCodes.length === 0) {
    console.log('❌ No invite codes found in database\n');
    return;
  }

  console.log('📋 Invite codes:\n');
  inviteCodes.forEach((code, idx) => {
    const status = code.usedAt ? `✓ Used by ${code.usedByEmail} on ${code.usedAt}` : '○ Unused';
    console.log(`  ${idx + 1}. ${code.code} - ${status}`);
  });

  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
