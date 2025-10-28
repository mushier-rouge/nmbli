#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🔧 Creating automation2@nmbli.app in Supabase Auth...\n');
  console.log('URL:', supabaseUrl);
  console.log('Service Key:', supabaseServiceKey.substring(0, 20) + '...\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if user already exists
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const existingUser = users?.users?.find(u => u.email === 'automation2@nmbli.app');

  if (existingUser) {
    console.log('✅ User already exists in Supabase:');
    console.log('   ID:', existingUser.id);
    console.log('   Email:', existingUser.email);

    // Update password
    console.log('\n🔄 Updating password...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: 'hE0fp6keXcnITdPAsoHZ!Aa9',
        email_confirm: true,
        user_metadata: { role: 'buyer', full_name: 'Automation2 Buyer' },
      }
    );

    if (updateError) {
      console.error('❌ Failed to update password:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Password updated successfully');
    process.exit(0);
  }

  // Create new user
  console.log('Creating new user...');
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'automation2@nmbli.app',
    password: 'hE0fp6keXcnITdPAsoHZ!Aa9',
    email_confirm: true,
    user_metadata: { role: 'buyer', full_name: 'Automation2 Buyer' },
  });

  if (error) {
    console.error('❌ Failed to create user:', error);
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    process.exit(1);
  }

  console.log('✅ User created successfully:');
  console.log('   ID:', data.user.id);
  console.log('   Email:', data.user.email);
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
