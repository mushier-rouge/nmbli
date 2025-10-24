#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

config({ path: resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not found');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function main() {
  try {
    const models = await genAI.listModels();
    console.log('Available Gemini models:');
    for (const model of models) {
      console.log(`  - ${model.name}`);
      console.log(`    Display name: ${model.displayName}`);
      console.log(`    Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

main();
