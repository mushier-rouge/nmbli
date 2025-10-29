#!/usr/bin/env tsx
/**
 * Test script to check if Google Maps API key works with Gemini
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('🧪 Testing Gemini API...\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Write a brief professional email requesting a quote for a 2024 Mazda CX-90 Premium. Keep it under 100 words.'
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Gemini API error:', response.status, error);
      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ Gemini API works!');
    console.log('\n📧 Sample email generated:');
    console.log('═'.repeat(50));
    console.log(data.candidates[0].content.parts[0].text);
    console.log('═'.repeat(50));
    console.log('\n✨ Ready to build quote request system!');

  } catch (error) {
    console.error('❌ Error testing Gemini:', error);
    process.exit(1);
  }
}

testGemini();
