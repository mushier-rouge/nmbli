#!/usr/bin/env tsx
/**
 * Test script to verify Gemini email generation for quote requests
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { generateQuoteRequestEmail } from '../src/lib/api/gemini';

async function testEmailGeneration() {
  console.log('🧪 Testing Quote Request Email Generation...\n');

  // Test initial quote request
  console.log('='.repeat(70));
  console.log('TEST 1: Initial Quote Request');
  console.log('='.repeat(70));

  try {
    const initialEmail = await generateQuoteRequestEmail({
      briefId: 'test-123',
      year: '2024',
      make: 'Mazda',
      model: 'CX-90',
      trim: 'Premium',
      dealerName: 'Stevens Creek Mazda',
      replyToEmail: 'quote-test-123@nmbli.com',
      round: 'initial',
    });

    console.log('\n📧 SUBJECT:', initialEmail.subject);
    console.log('\n📝 BODY:\n');
    console.log(initialEmail.body);
    console.log('\n✅ Initial email generated successfully!\n');
  } catch (error) {
    console.error('❌ Failed to generate initial email:', error);
    process.exit(1);
  }

  // Test counter-offer
  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: Counter-Offer Email');
  console.log('='.repeat(70));

  try {
    const counterEmail = await generateQuoteRequestEmail({
      briefId: 'test-123',
      year: '2024',
      make: 'Mazda',
      model: 'CX-90',
      trim: 'Premium',
      dealerName: 'Stevens Creek Mazda',
      replyToEmail: 'quote-test-123@nmbli.com',
      round: 'counter',
    });

    console.log('\n📧 SUBJECT:', counterEmail.subject);
    console.log('\n📝 BODY:\n');
    console.log(counterEmail.body);
    console.log('\n✅ Counter-offer email generated successfully!\n');
  } catch (error) {
    console.error('❌ Failed to generate counter-offer email:', error);
    process.exit(1);
  }

  // Test final round with lowest price
  console.log('\n' + '='.repeat(70));
  console.log('TEST 3: Final Round Email (with lowest price)');
  console.log('='.repeat(70));

  try {
    const finalEmail = await generateQuoteRequestEmail({
      briefId: 'test-123',
      year: '2024',
      make: 'Mazda',
      model: 'CX-90',
      trim: 'Premium',
      dealerName: 'Stevens Creek Mazda',
      replyToEmail: 'quote-test-123@nmbli.com',
      round: 'final',
      lowestPrice: 48500,
    });

    console.log('\n📧 SUBJECT:', finalEmail.subject);
    console.log('\n📝 BODY:\n');
    console.log(finalEmail.body);
    console.log('\n✅ Final round email generated successfully!\n');
  } catch (error) {
    console.error('❌ Failed to generate final email:', error);
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('✨ All email generation tests passed!');
  console.log('='.repeat(70));
}

testEmailGeneration();
