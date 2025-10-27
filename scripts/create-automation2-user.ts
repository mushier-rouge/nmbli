#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Supabase URL:', supabaseUrl);
  console.log('Service Key present:', !!supabaseServiceKey);
  console.log('Service Key length:', supabaseServiceKey?.length);

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = 'automation2@nmbli.app';
  const password = 'hE0fp6keXcnITdPAsoHZ!Aa9';

  console.log(`\nAttempting to create user: ${email}`);

  try {
    // First check if user exists
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ perPage: 100 });

    if (listError) {
      console.error('Error listing users:', listError);
      process.exit(1);
    }

    const existingUser = userList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      console.log('User already exists, updating password...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: { role: 'buyer', full_name: 'Automation2 Test Buyer' },
      });

      if (updateError) {
        console.error('Error updating user:', updateError);
        process.exit(1);
      }

      console.log('✅ User updated successfully');
    } else {
      console.log('Creating new user...');
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'buyer', full_name: 'Automation2 Test Buyer' },
      });

      if (error) {
        console.error('Error creating user:', error);
        process.exit(1);
      }

      console.log('✅ User created successfully');
      console.log('User ID:', data.user.id);
    }
  } catch (error) {
    console.error('Caught exception:', error);
    process.exit(1);
  }
}

main();
