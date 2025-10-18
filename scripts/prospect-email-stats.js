#!/usr/bin/env node
const { PrismaClient } = require('../src/generated/prisma');

(async () => {
  const prisma = new PrismaClient();
  try {
    const prospects = await prisma.dealerProspect.findMany({
      select: { id: true, name: true, email: true },
    });
    const total = prospects.length;
    const withEmail = prospects.filter((p) => p.email && p.email.trim()).length;
    const withoutEmail = total - withEmail;

    console.log('Dealer prospect stats');
    console.log('---------------------');
    console.log(`Total prospects : ${total}`);
    console.log(`With email      : ${withEmail}`);
    console.log(`Without email   : ${withoutEmail}`);

    if (withoutEmail > 0) {
      console.log('\nProspects missing email:');
      for (const p of prospects.filter((p) => !p.email || !p.email.trim())) {
        console.log(`- ${p.name} (${p.id})`);
      }
    }
  } catch (error) {
    console.error('Failed to load dealer prospects. Make sure DATABASE_URL is set and reachable.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
