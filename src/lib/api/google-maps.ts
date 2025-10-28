import { Client } from '@googlemaps/google-maps-services-js';

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  console.warn('GOOGLE_MAPS_API_KEY not set - dealer discovery will fail');
}

const client = new Client({});

export interface DealerInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  phone?: string;
  website?: string;
  email?: string;
}

/**
 * Find authorized dealerships for a specific make in a given state using Google Maps Places API
 */
export async function findDealersInState(params: {
  make: string;
  state: string;
  count?: number;
}): Promise<DealerInfo[]> {
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
  }

  const { make, state, count = 15 } = params;

  try {
    // Use text search to find dealerships
    const searchQuery = `${make} dealership in ${state}`;

    const response = await client.textSearch({
      params: {
        query: searchQuery,
        key: apiKey,
      },
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }

    const dealers: DealerInfo[] = [];
    const results = response.data.results.slice(0, count);

    // Get detailed info for each dealer
    for (const place of results) {
      if (!place.place_id) continue;

      try {
        const detailsResponse = await client.placeDetails({
          params: {
            place_id: place.place_id,
            key: apiKey,
            fields: ['name', 'formatted_address', 'address_components', 'formatted_phone_number', 'website'],
          },
        });

        if (detailsResponse.data.status === 'OK' && detailsResponse.data.result) {
          const details = detailsResponse.data.result;
          const addressComponents = details.address_components || [];

          // Extract city, state, zipcode from address components
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const city = addressComponents.find(c => c.types.includes('locality' as any))?.long_name || '';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stateCode = addressComponents.find(c => c.types.includes('administrative_area_level_1' as any))?.short_name || state;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const zipcode = addressComponents.find(c => c.types.includes('postal_code' as any))?.long_name || '';

          // Skip if not in the correct state
          if (stateCode.toUpperCase() !== state.toUpperCase()) {
            continue;
          }

          dealers.push({
            name: details.name || '',
            address: details.formatted_address || '',
            city,
            state: stateCode,
            zipcode,
            phone: details.formatted_phone_number,
            website: details.website,
            // Google Places API doesn't provide email, would need to scrape website
            email: undefined,
          });
        }
      } catch (error) {
        console.error(`Error fetching details for place ${place.place_id}:`, error);
      }
    }

    console.log(`Found ${dealers.length} ${make} dealers in ${state}`);
    return dealers;
  } catch (error) {
    console.error('Error finding dealers with Google Maps:', error);
    throw new Error(`Failed to find ${make} dealers in ${state}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
