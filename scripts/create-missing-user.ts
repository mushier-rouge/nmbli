import { PrismaClient } from '@/generated/prisma';

// This script creates a User record for an existing OAuth user
// Usage: npx tsx scripts/create-missing-user.ts <user-id> <email> <name>

async function createMissingUser() {
  const prisma = new PrismaClient();

  const userId = process.argv[2];
  const email = process.argv[3];
  const name = process.argv[4] || email.split('@')[0];

  if (!userId || !email) {
    console.error('Usage: npx tsx scripts/create-missing-user.ts <user-id> <email> [name]');
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (existingUser) {
      console.log(`✅ User already exists: ${existingUser.email} (${existingUser.id})`);
      return;
    }

    // Create the missing user
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email: email,
        name: name,
        role: 'buyer',
      }
    });

    console.log(`✨ Created User record:`);
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Role: ${newUser.role}`);
    console.log('\n🎉 Done! You can now create briefs.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingUser();
