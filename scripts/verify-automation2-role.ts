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
  console.log('🔍 Verifying automation2@nmbli.app role...\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check Supabase user
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const supabaseUser = users?.users?.find(u => u.email === 'automation2@nmbli.app');

  if (supabaseUser) {
    console.log('✅ Supabase Auth:');
    console.log('   ID:', supabaseUser.id);
    console.log('   Email:', supabaseUser.email);
    console.log('   Metadata:', JSON.stringify(supabaseUser.user_metadata, null, 2));
    console.log('   App Metadata:', JSON.stringify(supabaseUser.app_metadata, null, 2));

    // Create/update Prisma user
    const prismaUser = await prisma.user.upsert({
      where: { email: 'automation2@nmbli.app' },
      update: {
        id: supabaseUser.id,
        role: 'buyer',
        name: 'Automation2 Buyer',
      },
      create: {
        id: supabaseUser.id,
        email: 'automation2@nmbli.app',
        role: 'buyer',
        name: 'Automation2 Buyer',
      },
    });

    console.log('\n✅ Prisma Database:');
    console.log('   ID:', prismaUser.id);
    console.log('   Email:', prismaUser.email);
    console.log('   Role:', prismaUser.role);
    console.log('   Name:', prismaUser.name);

    // Verify IDs match
    if (supabaseUser.id === prismaUser.id) {
      console.log('\n✅ IDs match between Supabase and Prisma');
    } else {
      console.log('\n❌ WARNING: IDs do not match!');
    }
  } else {
    console.log('❌ User not found in Supabase');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
