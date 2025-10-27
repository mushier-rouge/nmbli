#!/usr/bin/env tsx
/**
 * Update Supabase auth user_metadata role for automation user
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const automationUserEmail = 'automation@nmbli.app';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔍 Finding automation user in Supabase...');

  // Find the user
  const { data: userList, error: fetchError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (fetchError) {
    console.error('❌ Failed to list users:', fetchError.message);
    process.exit(1);
  }

  const user = userList?.users?.find((u) => u.email?.toLowerCase() === automationUserEmail.toLowerCase());

  if (!user) {
    console.error(`❌ User ${automationUserEmail} not found in Supabase`);
    process.exit(1);
  }

  console.log('✅ Found user:', {
    id: user.id,
    email: user.email,
    currentMetadata: user.user_metadata,
  });

  // Update user metadata to set role to buyer
  console.log('🔄 Updating user metadata to role: buyer...');

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      role: 'buyer',
    },
  });

  if (error) {
    console.error('❌ Failed to update user:', error.message);
    process.exit(1);
  }

  console.log('✅ Updated user metadata:', {
    id: data.user.id,
    email: data.user.email,
    metadata: data.user.user_metadata,
  });

  console.log('\n✨ Supabase auth metadata update complete!\n');
}

main().catch((e) => {
  console.error('❌ Script failed:', e);
  process.exit(1);
});
