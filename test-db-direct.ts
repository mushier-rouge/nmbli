import { PrismaClient } from '@/generated/prisma';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:mEbneg-hupxuh-3gutku@db.pqtjudrthlxfejapmddf.supabase.co:5432/postgres?sslmode=require";

async function testConnection() {
  console.log('Testing database connection...');
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
    console.log('✅ Database connection successful!');
    
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
