import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const testBuyer = await prisma.user.upsert({
    where: { email: 'test-buyer@nmbli.com' },
    update: {},
    create: {
      email: 'test-buyer@nmbli.com',
      name: 'Test Buyer',
      role: 'buyer',
    },
  });

  const testOps = await prisma.user.upsert({
    where: { email: 'test-ops@nmbli.com' },
    update: {},
    create: {
      email: 'test-ops@nmbli.com',
      name: 'Test Ops',
      role: 'ops',
    },
  });

  console.log('✅ Created test users:', {
    buyer: testBuyer.email,
    ops: testOps.email,
  });

  // Create test briefs
  const testBrief1 = await prisma.brief.upsert({
    where: { id: 'test-brief-1' },
    update: {},
    create: {
      id: 'test-brief-1',
      buyerId: testBuyer.id,
      status: 'sourcing',
      zipcode: '98101', // Seattle, WA
      paymentType: 'lease',
      maxOTD: 45000,
      makes: ['Toyota'],
      models: ['Camry'],
      trims: ['XSE'],
      colors: ['White', 'Silver', 'Black'],
      mustHaves: ['Sunroof', 'Heated seats'],
      timelinePreference: 'Within 2 weeks',
      paymentPreferences: [
        {
          downPayment: 3000,
          monthlyBudget: 450,
          termMonths: 36,
        },
      ],
    },
  });

  const testBrief2 = await prisma.brief.upsert({
    where: { id: 'test-brief-2' },
    update: {},
    create: {
      id: 'test-brief-2',
      buyerId: testBuyer.id,
      status: 'sourcing',
      zipcode: '90210', // Los Angeles, CA
      paymentType: 'finance',
      maxOTD: 60000,
      makes: ['Honda', 'Toyota'],
      models: ['Accord', 'Camry'],
      trims: ['Sport', 'XSE'],
      colors: ['Blue', 'Gray'],
      mustHaves: ['Apple CarPlay', 'Backup camera'],
      timelinePreference: 'Flexible',
      paymentPreferences: [
        {
          downPayment: 5000,
          monthlyBudget: 600,
          termMonths: 60,
        },
      ],
    },
  });

  const testBrief3 = await prisma.brief.upsert({
    where: { id: 'test-brief-3' },
    update: {},
    create: {
      id: 'test-brief-3',
      buyerId: testBuyer.id,
      status: 'sourcing',
      zipcode: '60601', // Chicago, IL
      paymentType: 'cash',
      maxOTD: 35000,
      makes: ['Mazda'],
      models: ['CX-5'],
      trims: ['Touring'],
      colors: ['Red', 'White'],
      mustHaves: ['AWD'],
      timelinePreference: 'ASAP',
      paymentPreferences: [],
    },
  });

  console.log('✅ Created test briefs:', {
    brief1: testBrief1.id,
    brief2: testBrief2.id,
    brief3: testBrief3.id,
  });

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
  console.log('Test accounts:');
  console.log('  Buyer: test-buyer@nmbli.com');
  console.log('  Ops: test-ops@nmbli.com');
  console.log('\nTest briefs:');
  console.log('  Brief 1 (Seattle Toyota): test-brief-1');
  console.log('  Brief 2 (LA Honda/Toyota): test-brief-2');
  console.log('  Brief 3 (Chicago Mazda): test-brief-3');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
