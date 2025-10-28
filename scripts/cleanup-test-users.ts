#!/usr/bin/env tsx
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up test users...\n');

  // Keep only automation2@nmbli.app, delete all others except the main user (sanjay)
  const usersToDelete = [
    'buyer@example.com',
    'test-buyer@nmbli.com',
    'automation2@nmbli.com', // Wrong domain
    'automation@nmbli.app', // Old automation user
    'test-ops@nmbli.com',
  ];

  for (const email of usersToDelete) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        // Delete user's briefs first (cascade should handle this but being explicit)
        await prisma.brief.deleteMany({ where: { buyerId: user.id } });

        // Delete user
        await prisma.user.delete({ where: { email } });
        console.log(`✅ Deleted: ${email}`);
      } else {
        console.log(`⏭️  Skipped (not found): ${email}`);
      }
    } catch (error) {
      console.error(`❌ Failed to delete ${email}:`, error);
    }
  }

  console.log('\n📋 Remaining users:');
  const remainingUsers = await prisma.user.findMany({
    select: { email: true, role: true, name: true },
  });

  remainingUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.role})`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
