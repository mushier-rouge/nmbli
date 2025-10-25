#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { prisma } = await import('../src/lib/prisma');

  console.log('🔍 Checking database for briefs with email: sanjay.devnani@gmail.com\n');

  const user = await prisma.user.findUnique({
    where: { email: 'sanjay.devnani@gmail.com' }
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log(`✅ Found user: ${user.id}\n`);

  const briefs = await prisma.brief.findMany({
    where: { buyerId: user.id },
    select: {
      id: true,
      makes: true,
      models: true,
      trims: true,
      mustHaves: true,
      createdAt: true,
    }
  });

  console.log(`Found ${briefs.length} briefs:\n`);

  briefs.forEach((brief, i) => {
    console.log(`Brief ${i + 1} (${brief.id}):`);
    console.log(`  makes type: ${typeof brief.makes}, Array: ${Array.isArray(brief.makes)}`);
    console.log(`  makes value:`, brief.makes);
    console.log(`  makes[0] type:`, typeof brief.makes[0]);
    console.log(`  makes[0] value:`, brief.makes[0]);
    console.log(`  makes[0] === object:`, typeof brief.makes[0] === 'object');
    console.log();
    console.log(`  models type: ${typeof brief.models}, Array: ${Array.isArray(brief.models)}`);
    console.log(`  models value:`, brief.models);
    console.log();
    console.log(`  JSON.stringify(makes):`, JSON.stringify(brief.makes));
    console.log();
  });

  await prisma.$disconnect();
}

main().catch(console.error);
