#!/usr/bin/env tsx
/**
 * Seeds database with 25 invite codes and exports to CSV
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();

// 25 creative, car-themed invite codes
const inviteCodes = [
  'turbocharge',
  'fastlane',
  'revup',
  'drivetime',
  'autodrive',
  'roadtrip',
  'carquest',
  'wheelsdeal',
  'keysready',
  'ignition',
  'fullthrottle',
  'gearshift',
  'overdrive',
  'autopilot',
  'highway',
  'joyride',
  'speedway',
  'parkingspot',
  'vroom',
  'dealfinder',
  'carenthusiast',
  'newwheels',
  'dreamcar',
  'carboss',
  'automate'
];

async function main() {
  console.log('🌱 Seeding 25 invite codes...\n');

  const created: Array<{ code: string; status: string }> = [];
  const skipped: Array<{ code: string; reason: string }> = [];

  for (const code of inviteCodes) {
    try {
      // Check if code already exists
      const existing = await prisma.inviteCode.findUnique({
        where: { code },
      });

      if (existing) {
        const status = existing.usedAt ? 'used' : 'available';
        skipped.push({ code, reason: `Already exists (${status})` });
        continue;
      }

      // Create new code
      await prisma.inviteCode.create({
        data: { code },
      });

      created.push({ code, status: 'available' });
      console.log(`✅ Created: ${code}`);
    } catch (error) {
      console.error(`❌ Failed to create ${code}:`, error);
      skipped.push({ code, reason: 'Error creating' });
    }
  }

  console.log(`\n✨ Created ${created.length} new invite codes`);
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped ${skipped.length} codes (already exist)`);
  }

  // Get all codes from database for CSV
  const allCodes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Generate CSV
  const csvLines = ['code,status,used_by,used_at'];

  allCodes.forEach((code) => {
    const status = code.usedAt ? 'used' : 'available';
    const usedBy = code.usedByEmail || '';
    const usedAt = code.usedAt ? code.usedAt.toISOString() : '';
    csvLines.push(`${code.code},${status},${usedBy},${usedAt}`);
  });

  const csvContent = csvLines.join('\n');
  const csvPath = join(process.cwd(), 'invite-codes.csv');

  await writeFile(csvPath, csvContent, 'utf-8');

  console.log(`\n📄 CSV exported to: invite-codes.csv`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total codes: ${allCodes.length}`);
  console.log(`   Available: ${allCodes.filter(c => !c.usedAt).length}`);
  console.log(`   Used: ${allCodes.filter(c => c.usedAt).length}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
