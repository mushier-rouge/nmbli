#!/usr/bin/env tsx
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Update the automation2 user to match Supabase Auth ID
  const supabaseId = 'e3b6a119-5c86-4933-9393-2a28771d6f02';

  const user = await prisma.user.update({
    where: { email: 'automation2@nmbli.app' },
    data: { id: supabaseId },
  });

  console.log('✅ Updated automation2 user ID:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
