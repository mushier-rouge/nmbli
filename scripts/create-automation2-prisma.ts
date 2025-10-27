#!/usr/bin/env tsx
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const userId = '308387b6-3a17-4077-a239-491dfa4cfa67';
  const email = 'automation2@nmbli.com';

  const user = await prisma.user.upsert({
    where: { email },
    update: { id: userId, role: 'buyer', name: 'Automation2 Test Buyer' },
    create: { id: userId, email, role: 'buyer', name: 'Automation2 Test Buyer' },
  });

  console.log('✅ Prisma user created/updated:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
