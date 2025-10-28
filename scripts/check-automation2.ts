#!/usr/bin/env tsx
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'automation2@nmbli.app' },
  });

  if (user) {
    console.log('✅ automation2 user exists:');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Name:', user.name);
    console.log('   ID:', user.id);
  } else {
    console.log('❌ automation2 user does NOT exist in database');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
