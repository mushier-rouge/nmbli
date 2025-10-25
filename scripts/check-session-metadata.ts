#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('Checking user metadata for all users:\n');

  users?.forEach(user => {
    if (user.email === 'sanjay.devnani@gmail.com') {
      console.log(`User: ${user.email}`);
      console.log(`user_metadata:`, user.user_metadata);
      console.log(`user_metadata.role:`, user.user_metadata?.role);
      console.log(`typeof role:`, typeof user.user_metadata?.role);
      console.log(`role is object:`, typeof user.user_metadata?.role === 'object');
      console.log(`JSON.stringify(role):`, JSON.stringify(user.user_metadata?.role));
      console.log();
    }
  });
}

main().catch(console.error);
