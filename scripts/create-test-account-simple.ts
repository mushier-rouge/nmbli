#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const { prisma } = await import('../src/lib/prisma');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const testEmail = 'test@example.com';
  const testPassword = 'test123456';

  console.log('🔧 Creating test account...\n');

  // Try to sign up
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        role: 'buyer',
        name: 'Test User',
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log(`✅ Test account already exists: ${testEmail}`);
    } else {
      console.error('❌ Error creating test user:', error.message);
      return;
    }
  } else if (data.user) {
    console.log(`✅ Test account created: ${testEmail}`);
    console.log(`   User ID: ${data.user.id}`);

    // Create corresponding database user record
    try {
      await prisma.user.upsert({
        where: { email: testEmail },
        create: {
          email: testEmail,
          role: 'buyer',
        },
        update: {
          role: 'buyer',
        },
      });
      console.log('✅ Database user record created');
    } catch (dbError) {
      console.error('⚠️  Database user creation failed:', dbError);
    }
  }

  console.log('\n📋 Test Account Credentials:');
  console.log(`   Email:    ${testEmail}`);
  console.log(`   Password: ${testPassword}`);
  console.log('\n🔗 Use these credentials to sign in at http://localhost:3005/login');
  console.log('   Switch to "Password" tab and enter the credentials above');

  await prisma.$disconnect();
}

main().catch(console.error);
