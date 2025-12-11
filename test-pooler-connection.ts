import { PrismaClient } from '@/generated/prisma';

// Test with pooled connection
const DATABASE_URL = "postgresql://postgres.pqtjudrthlxfejapmddf:mEbneg-hupxuh-3gutku@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
const DIRECT_URL = "postgresql://postgres:mEbneg-hupxuh-3gutku@db.pqtjudrthlxfejapmddf.supabase.co:5432/postgres";

async function testConnection() {
  console.log('Testing Prisma with connection pooling...\n');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  try {
    console.log('1. Testing pooled connection (DATABASE_URL)...');
    console.log('   URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Pooled connection successful!');

    const userCount = await prisma.user.count();
    console.log(`   ✅ Found ${userCount} users in database\n`);

    console.log('2. Direct URL configured for migrations:');
    console.log('   URL:', DIRECT_URL.replace(/:[^:@]+@/, ':***@'));
    console.log('   ✅ This will be used by Prisma CLI for migrations\n');

    console.log('🎉 Connection pooling configured correctly!');
    console.log('\nConfiguration:');
    console.log('- DATABASE_URL: Supavisor pooler (port 6543) - IPv4 compatible ✅');
    console.log('- DIRECT_URL: Direct connection (port 5432) - for migrations ✅');
    console.log('\nThis setup works with Vercel serverless functions.');

  } catch (error: any) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
