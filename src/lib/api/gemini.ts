import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(apiKey);

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
 * Find authorized dealerships for a specific make in a given state
 */
export async function findDealersInState(params: {
  make: string;
  state: string;
  count?: number;
}): Promise<DealerInfo[]> {
  const { make, state, count = 15 } = params;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Find ${count} authorized ${make} dealerships in ${state}.

For each dealership, provide the following information in JSON format:
- name: Full dealership name
- address: Street address
- city: City name
- state: State abbreviation (${state})
- zipcode: ZIP code
- phone: Phone number (if available)
- website: Website URL (if available)
- email: Sales department email (if available)

Return ONLY a valid JSON array of objects. Do not include any explanatory text.

Example format:
[
  {
    "name": "ABC Toyota",
    "address": "123 Main St",
    "city": "Seattle",
    "state": "WA",
    "zipcode": "98101",
    "phone": "206-555-1234",
    "website": "https://abctoyota.com",
    "email": "sales@abctoyota.com"
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response (sometimes wrapped in markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const dealers = JSON.parse(jsonText) as DealerInfo[];

    // Validate and clean data
    return dealers
      .filter((dealer) => dealer.name && dealer.address && dealer.city)
      .map((dealer) => ({
        ...dealer,
        state: state.toUpperCase(),
        make,
      }));
  } catch (error) {
    console.error('Error finding dealers with Gemini:', error);
    throw new Error(`Failed to find ${make} dealers in ${state}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract contact information from dealer website or search results
 */
export async function extractDealerContact(params: {
  dealerName: string;
  websiteUrl?: string;
}): Promise<{ email?: string; phone?: string }> {
  const { dealerName, websiteUrl } = params;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = websiteUrl
    ? `Find the sales department contact information for ${dealerName} at ${websiteUrl}. Return JSON with "email" and "phone" fields.`
    : `Find the sales department contact information for ${dealerName}. Return JSON with "email" and "phone" fields.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error extracting dealer contact:', error);
    return {};
  }
}
