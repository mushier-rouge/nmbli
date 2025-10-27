#!/usr/bin/env tsx
/**
 * Update automation user role to buyer in production
 */

import { PrismaClient } from '../src/generated/prisma';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

const automationUserEmail = 'automation@nmbli.app';

async function main() {
  console.log('🔄 Updating automation user...');

  try {
    // Update the user role to buyer
    const user = await prisma.user.update({
      where: { email: automationUserEmail },
      data: {
        role: 'buyer',
        name: 'Automation Test Buyer',
      },
    });

    console.log('✅ Updated automation user:', {
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Create test briefs for automation user
    const brief1 = await prisma.brief.upsert({
      where: { id: 'automation-brief-1' },
      update: {},
      create: {
        id: 'automation-brief-1',
        buyerId: user.id,
        status: 'sourcing',
        zipcode: '94102',
        paymentType: 'lease',
        maxOTD: 50000,
        makes: ['Tesla', 'BMW'],
        models: ['Model 3', '3 Series'],
        trims: ['Long Range', 'M Sport'],
        colors: ['Black', 'White', 'Blue'],
        mustHaves: ['Autopilot', 'Premium sound'],
        timelinePreference: 'Within 1 month',
        paymentPreferences: [
          {
            downPayment: 4000,
            monthlyBudget: 500,
            termMonths: 36,
          },
        ],
      },
    });

    const brief2 = await prisma.brief.upsert({
      where: { id: 'automation-brief-2' },
      update: {},
      create: {
        id: 'automation-brief-2',
        buyerId: user.id,
        status: 'sourcing',
        zipcode: '98101',
        paymentType: 'finance',
        maxOTD: 65000,
        makes: ['Audi', 'Mercedes-Benz'],
        models: ['A4', 'C-Class'],
        trims: ['Premium Plus', 'AMG'],
        colors: ['Gray', 'Silver'],
        mustHaves: ['Leather seats', 'Navigation'],
        timelinePreference: 'Flexible',
        paymentPreferences: [
          {
            downPayment: 6000,
            monthlyBudget: 700,
            termMonths: 60,
          },
        ],
      },
    });

    console.log('✅ Created automation test briefs:', {
      brief1: brief1.id,
      brief2: brief2.id,
    });

    console.log('\n✨ Automation user setup complete!\n');
  } catch (error) {
    console.error('❌ Failed to update automation user:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
