#!/usr/bin/env tsx
import { PrismaClient } from '../src/generated/prisma';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local'), override: true });

const prisma = new PrismaClient();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log('🗑️  Deleting automation2@nmbli.app from everywhere...\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete from Supabase Auth
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const user = users?.users?.find(u => u.email === 'automation2@nmbli.app');

  if (user) {
    await supabase.auth.admin.deleteUser(user.id);
    console.log('✅ Deleted from Supabase Auth');
  } else {
    console.log('ℹ️  User not found in Supabase Auth');
  }

  // Delete from Prisma
  try {
    await prisma.user.delete({ where: { email: 'automation2@nmbli.app' } });
    console.log('✅ Deleted from Prisma database');
  } catch (error) {
    console.log('ℹ️  User not found in Prisma database');
  }

  console.log('\n✅ automation2@nmbli.app completely removed');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
