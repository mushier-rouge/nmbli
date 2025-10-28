import { PrismaClient } from '../src/generated/prisma';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function ensureAutomation2User() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️  Skipping automation2 user creation');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = 'automation2@nmbli.app';
  const password = 'hE0fp6keXcnITdPAsoHZ!Aa9';

  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const existingUser = userList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId = existingUser?.id;

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'buyer', full_name: 'Automation2 Buyer' },
    });

    if (error) {
      console.error('❌ Failed to create automation2:', error.message);
      return null;
    }

    userId = data.user.id;
    console.log(`✅ automation2 created: ${email}`);
  } else {
    await supabase.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { role: 'buyer', full_name: 'Automation2 Buyer' },
    });
    console.log(`ℹ️  automation2 updated: ${email}`);
  }

  if (!userId) return null;

  await prisma.user.upsert({
    where: { email },
    update: { id: userId, role: 'buyer', name: 'Automation2 Buyer' },
    create: { id: userId, email, role: 'buyer', name: 'Automation2 Buyer' },
  });

  return userId;
}


async function main() {
  console.log('🌱 Seeding database...');

  // Create automation2 user (only test user)
  const automation2UserId = await ensureAutomation2User();

  if (!automation2UserId) {
    console.warn('⚠️  Could not create automation2 user');
    return;
  }

  console.log('✅ Created automation2 user: automation2@nmbli.app');

  // Create some test dealerships
  const testDealer1 = await prisma.dealership.upsert({
    where: { id: 'test-dealer-1' },
    update: {},
    create: {
      id: 'test-dealer-1',
      name: 'Test Toyota Seattle',
      make: 'Toyota',
      state: 'WA',
      city: 'Seattle',
      address: '123 Test St',
      zipcode: '98101',
      phone: '+12065551234',
      website: 'https://test-toyota-seattle.example.com',
      email: 'sales@test-toyota-seattle.com',
      verified: true,
    },
  });

  const testDealer2 = await prisma.dealership.upsert({
    where: { id: 'test-dealer-2' },
    update: {},
    create: {
      id: 'test-dealer-2',
      name: 'Test Honda Seattle',
      make: 'Honda',
      state: 'WA',
      city: 'Seattle',
      address: '456 Test Ave',
      zipcode: '98102',
      phone: '+12065555678',
      website: 'https://test-honda-seattle.example.com',
      email: 'sales@test-honda-seattle.com',
      verified: true,
    },
  });

  console.log('✅ Created test dealerships:', {
    dealer1: testDealer1.name,
    dealer2: testDealer2.name,
  });

  // Create test dealer contacts
  const testContact1 = await prisma.dealerContact.upsert({
    where: { email: 'john@test-toyota-seattle.com' },
    update: {},
    create: {
      dealershipId: testDealer1.id,
      name: 'John Smith',
      email: 'john@test-toyota-seattle.com',
      phone: '+12065551111',
      role: 'sales',
      preferredContactMethod: 'email',
    },
  });

  const testContact2 = await prisma.dealerContact.upsert({
    where: { email: 'jane@test-honda-seattle.com' },
    update: {},
    create: {
      dealershipId: testDealer2.id,
      name: 'Jane Doe',
      email: 'jane@test-honda-seattle.com',
      phone: '+12065552222',
      role: 'sales',
      preferredContactMethod: 'email',
    },
  });

  console.log('✅ Created test contacts:', {
    contact1: testContact1.email,
    contact2: testContact2.email,
  });

  console.log('\n✨ Database seeding complete!\n');
  console.log('Test account:');
  console.log('  automation2@nmbli.app (buyer)');
  console.log('  Password: hE0fp6keXcnITdPAsoHZ!Aa9');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
