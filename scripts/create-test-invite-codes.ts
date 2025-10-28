#!/usr/bin/env tsx
import { PrismaClient } from '../src/generated/prisma';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

// Test invite codes for local testing
const TEST_CODES = [
  'testdrive',
  'horsepower',
  'cruisecontrol',
];

async function main() {
  console.log('🎟️  Creating test invite codes...\n');

  let created = 0;
  let skipped = 0;

  for (const code of TEST_CODES) {
    try {
      await prisma.inviteCode.create({
        data: { code },
      });
      console.log(`✅ Created: ${code}`);
      created++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⏭️  Skipped (already exists): ${code}`);
        skipped++;
      } else {
        console.error(`❌ Error creating ${code}:`, error.message);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total codes: ${TEST_CODES.length}`);

  // Show all unused codes
  const unusedCodes = await prisma.inviteCode.findMany({
    where: { usedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n🎫 Unused invite codes (${unusedCodes.length}):`);
  unusedCodes.forEach((invite, idx) => {
    console.log(`   ${idx + 1}. ${invite.code}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
