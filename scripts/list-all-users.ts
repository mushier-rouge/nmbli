#!/usr/bin/env tsx
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, name: true },
  });

  console.log(`📋 Found ${users.length} users in database:\n`);
  users.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Name: ${user.name}\n`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
