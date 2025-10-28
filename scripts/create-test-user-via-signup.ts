#!/usr/bin/env tsx
/**
 * Create automation2 user via regular signup (not admin API)
 * This works even without service role key
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase env vars');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Try to sign up automation2 user
  const email = 'automation2@nmbli.com';
  const password = 'password123'; // Using old password as requested

  console.log(`📝 Attempting to sign up ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'buyer',
        full_name: 'Automation2 Buyer',
      },
    },
  });

  if (error) {
    // User might already exist
    if (error.message.includes('already registered') || error.message.includes('already exists')) {
      console.log(`ℹ️  User ${email} already exists`);
      console.log('✅ You can use this user for testing');
      process.exit(0);
    } else {
      console.error('❌ Signup failed:', error.message);
      process.exit(1);
    }
  }

  if (data.user) {
    console.log('✅ User created successfully:', data.user.id);
    console.log(`   Email: ${email}`);
    console.log(`   Password: password123`);

    if (data.session) {
      console.log('✅ Session established');
    } else {
      console.log('ℹ️  Email confirmation may be required');
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
