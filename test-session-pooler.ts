import { PrismaClient } from '@/generated/prisma';

// Session mode pooler (IPv4 compatible)
const DATABASE_URL = "postgresql://postgres.pqtjudrthlxfejapmddf:mEbneg-hupxuh-3gutku@aws-0-us-east-2.pooler.supabase.com:5432/postgres";

async function testConnection() {
  console.log('Testing Supabase Session Mode Pooler (IPv4 compatible)...\n');
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
    console.log('✅ Session mode pooler connection successful!');

    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);

    console.log('\n🎉 This uses pooler.supabase.com which is IPv4-compatible!');

  } catch (error: any) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
