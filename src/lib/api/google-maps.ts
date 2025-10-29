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
 * Convert zip code to lat/lng coordinates using Google Geocoding API
 */
async function zipToLatLng(zipcode: string): Promise<{ lat: number; lng: number } | null> {
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
  }

  try {
    const response = await client.geocode({
      params: {
        address: zipcode,
        key: apiKey,
      },
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }

    console.warn(`Failed to geocode zip code ${zipcode}: ${response.data.status}`);
    return null;
  } catch (error) {
    console.error(`Error geocoding zip code ${zipcode}:`, error);
    return null;
  }
}

/**
 * Find authorized dealerships for a specific make near a zip code using Google Maps Places API
 * Searches within a 100-mile radius and returns results sorted by distance
 */
export async function findDealersInState(params: {
  make: string;
  state: string;
  zipcode?: string;
  count?: number;
}): Promise<DealerInfo[]> {
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
  }

  const { make, state, zipcode, count = 15 } = params;

  try {
    let location: { lat: number; lng: number } | null = null;

    // If zipcode provided, convert to lat/lng for proximity search
    if (zipcode) {
      location = await zipToLatLng(zipcode);
      if (location) {
        console.log(`Geocoded ${zipcode} to lat=${location.lat}, lng=${location.lng}`);
      }
    }

    // Build search query and params
    const searchQuery = `${make} dealership`;
    const searchParams: {
      query: string;
      key: string;
      location?: string;
      radius?: number;
    } = {
      query: searchQuery,
      key: apiKey,
    };

    // If we have location, search within 100 miles (160934 meters)
    // Otherwise fall back to state-wide search
    if (location) {
      searchParams.location = `${location.lat},${location.lng}`;
      searchParams.radius = 160934; // 100 miles in meters
      console.log(`Searching for ${make} dealers within 100 miles of ${zipcode}`);
    } else {
      searchParams.query = `${make} dealership in ${state}`;
      console.log(`Searching for ${make} dealers state-wide in ${state}`);
    }

    const response = await client.textSearch({
      params: searchParams,
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

    const locationDesc = zipcode ? `within 100 miles of ${zipcode}` : `in ${state}`;
    console.log(`Found ${dealers.length} ${make} dealers ${locationDesc}`);
    return dealers;
  } catch (error) {
    console.error('Error finding dealers with Google Maps:', error);
    const locationDesc = zipcode ? `near ${zipcode}` : `in ${state}`;
    throw new Error(`Failed to find ${make} dealers ${locationDesc}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
