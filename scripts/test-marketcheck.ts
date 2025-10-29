/**
 * Test script to query MarketCheck API for specific inventory
 * Example: Mazda CX-90s at Stevens Creek Mazda in San Jose
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MARKETCHECK_API_KEY = process.env.key;
const BASE_URL = 'https://api.marketcheck.com/v2';

interface MarketCheckSearchParams {
  api_key: string;
  make?: string;
  model?: string;
  year?: number;
  dealer_name?: string;
  city?: string;
  state?: string;
  radius?: number;
  rows?: number;
  car_type?: string;
  seller_type?: string;
}

async function searchInventory(params: MarketCheckSearchParams) {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const url = `${BASE_URL}/search/car/active?${queryParams.toString()}`;

  console.log('🔍 Searching MarketCheck API...');
  console.log('URL:', url);
  console.log('\n');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MarketCheck API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching from MarketCheck:', error);
    throw error;
  }
}

async function main() {
  if (!MARKETCHECK_API_KEY) {
    console.error('❌ MarketCheck API key not found in .env.local');
    console.error('Expected env variable: key=<your_key>');
    process.exit(1);
  }

  console.log('🚗 Testing MarketCheck API');
  console.log('=' .repeat(50));
  console.log('\n');

  try {
    // Search for Mazda CX-90s at Stevens Creek Mazda in San Jose
    // Restrict to new cars from dealers only (no FSBO/used)
    const results = await searchInventory({
      api_key: MARKETCHECK_API_KEY,
      make: 'Mazda',
      model: 'CX-90',
      dealer_name: 'Stevens Creek Mazda',
      city: 'San Jose',
      state: 'CA',
      car_type: 'new',
      seller_type: 'dealer',
      rows: 50, // Get up to 50 results
    });

    // Save raw response to archive
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.resolve(process.cwd(), 'archive', `marketcheck-response-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`💾 Raw response saved to: ${outputPath}`);
    console.log('\n');

    console.log('✅ API Response:');
    console.log('=' .repeat(50));
    console.log('\n');

    if (results.num_found === 0) {
      console.log('⚠️  No vehicles found matching criteria');
      console.log('\n');
      console.log('Let\'s try a broader search (all Mazda at Stevens Creek):');

      const broaderResults = await searchInventory({
        api_key: MARKETCHECK_API_KEY,
        make: 'Mazda',
        dealer_name: 'Stevens Creek',
        city: 'San Jose',
        state: 'CA',
        car_type: 'new',
        seller_type: 'dealer',
        rows: 50,
      });

      console.log(`Found ${broaderResults.num_found} Mazda vehicles`);

      if (broaderResults.listings && broaderResults.listings.length > 0) {
        console.log('\nSample vehicles:');
        broaderResults.listings.slice(0, 5).forEach((listing: any, i: number) => {
          console.log(`\n${i + 1}. ${listing.year} ${listing.make} ${listing.model} ${listing.trim || ''}`);
          console.log(`   VIN: ${listing.vin}`);
          console.log(`   Price: $${listing.price?.toLocaleString() || 'N/A'}`);
          console.log(`   Dealer: ${listing.dealer_name}`);
          console.log(`   Location: ${listing.dealer_city}, ${listing.dealer_state}`);
          console.log(`   Stock: ${listing.stock_no || 'N/A'}`);
        });
      }

      return;
    }

    console.log(`📊 Total vehicles found: ${results.num_found}`);
    console.log(`📄 Listings returned: ${results.listings?.length || 0}`);
    console.log('\n');

    if (results.listings && results.listings.length > 0) {
      console.log('🚗 Available Mazda CX-90s:');
      console.log('=' .repeat(50));

      results.listings.forEach((listing: any, index: number) => {
        console.log(`\n${index + 1}. ${listing.year} Mazda CX-90 ${listing.trim || ''}`);
        console.log(`   VIN: ${listing.vin}`);
        console.log(`   Price: $${listing.price?.toLocaleString() || 'N/A'}`);
        console.log(`   Miles: ${listing.miles?.toLocaleString() || 'N/A'}`);
        console.log(`   Exterior: ${listing.exterior_color || 'N/A'}`);
        console.log(`   Interior: ${listing.interior_color || 'N/A'}`);
        console.log(`   Dealer: ${listing.dealer_name}`);
        console.log(`   Location: ${listing.dealer_city}, ${listing.dealer_state} ${listing.dealer_zip}`);
        console.log(`   Stock #: ${listing.stock_no || 'N/A'}`);
        console.log(`   Listing URL: ${listing.vdp_url || 'N/A'}`);
      });
    }

    console.log('\n');
    console.log('📈 API Usage Stats:');
    console.log(`   Rate limit remaining: ${results.rate_limit_remaining || 'N/A'}`);
    console.log(`   Total API calls: 1`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
