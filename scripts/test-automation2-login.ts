#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔐 Testing login for automation2@nmbli.app...\n');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'automation2@nmbli.app',
    password: 'hE0fp6keXcnITdPAsoHZ!Aa9',
  });

  if (error) {
    console.log('❌ Login failed:', error.message);
    process.exit(1);
  }

  if (data.user) {
    console.log('✅ Login successful!');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Role:', data.user.user_metadata?.role);
    process.exit(0);
  } else {
    console.log('❌ Login failed: No user data returned');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
