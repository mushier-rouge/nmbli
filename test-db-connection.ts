import { PrismaClient } from '@/generated/prisma';

const DATABASE_URL = "postgresql://postgres.pqtjudrthlxfejapmddf:mEbneg-hupxuh-3gutku@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

async function testConnection() {
  console.log('Testing database connection with pooler URL...');
  console.log('URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  });

  try {
    // Test simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful!');
    console.log('Query result:', result);
    
    // Test actual table query
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);
    
  } catch (error: any) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
