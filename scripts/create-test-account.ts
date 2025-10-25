#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const { prisma } = await import('../src/lib/prisma');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    console.log('\nTo create test accounts, you need the service role key from Supabase dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api');
    console.log('2. Copy the "service_role" secret key');
    console.log('3. Add to .env.local as SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testEmail = 'test@nmbli.app';
  const testPassword = 'test123456';

  console.log('🔧 Creating test account...\n');

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === testEmail);

  if (existingUser) {
    console.log(`✅ Test account already exists: ${testEmail}`);
    console.log(`   User ID: ${existingUser.id}`);
  } else {
    // Create new test user
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        role: 'buyer',
        name: 'Test User',
      },
    });

    if (error) {
      console.error('❌ Error creating test user:', error);
      return;
    }

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
