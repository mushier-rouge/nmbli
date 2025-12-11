import { PrismaClient } from '@/generated/prisma';

// Transaction mode format (for serverless)
const DATABASE_URL = "postgresql://postgres:mEbneg-hupxuh-3gutku@db.pqtjudrthlxfejapmddf.supabase.co:6543/postgres";

async function testConnection() {
  console.log('Testing Supavisor Transaction Mode (for serverless)...\n');
  console.log('URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Transaction mode connection successful!');

    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);

    console.log('\n🎉 This is the correct format for Vercel serverless!');

  } catch (error: any) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
