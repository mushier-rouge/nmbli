import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

// Initialize with a placeholder if not set (will throw error when actually used)
const genAI = new GoogleGenerativeAI(apiKey || 'placeholder');

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
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const { make, state, count = 15 } = params;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

export interface QuoteRequestParams {
  briefId: string;
  year: string;
  make: string;
  model: string;
  trim?: string;
  dealerName: string;
  replyToEmail: string;
  round?: 'initial' | 'counter' | 'final';
  lowestPrice?: number;
  vehicleDetails?: {
    vin?: string;
    stockNumber?: string;
    msrp?: number;
  };
}

export interface QuoteEmailResult {
  subject: string;
  body: string;
}

/**
 * Generate mock VIN and stock number for testing
 */
function generateMockVehicleData() {
  const vin = '1HGCM' + Math.random().toString(36).substring(2, 15).toUpperCase().substring(0, 12);
  const stockNumber = 'STK' + Math.floor(Math.random() * 90000 + 10000);
  return { vin, stockNumber };
}

/**
 * Generate quote request email using Gemini AI
 */
export async function generateQuoteRequestEmail(params: QuoteRequestParams): Promise<QuoteEmailResult> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const {
    year,
    make,
    model,
    trim,
    dealerName,
    round = 'initial',
    lowestPrice,
    vehicleDetails = {},
  } = params;

  const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Generate mock data if not provided
  const mockData = generateMockVehicleData();
  const stockNumber = vehicleDetails.stockNumber || mockData.stockNumber;

  let prompt = '';

  switch (round) {
    case 'initial':
      prompt = `Write a professional email to ${dealerName} requesting a quote for a ${year} ${make} ${model}${trim ? ' ' + trim : ''}.

The email should:
- Be brief and professional (under 150 words)
- Request an out-the-door price quote
- Mention the specific vehicle: ${year} ${make} ${model}${trim ? ' ' + trim : ''}
- Reference stock number: ${stockNumber}
- Request a breakdown of MSRP, dealer discount, taxes, and fees
- Indicate that the buyer is serious and ready to purchase
- Ask for a response within 24 hours
- Sign off professionally

Return ONLY a JSON object with "subject" and "body" fields. No markdown, no explanations.`;
      break;

    case 'counter':
      prompt = `Write a professional counter-offer email to ${dealerName} for a ${year} ${make} ${model}${trim ? ' ' + trim : ''}.

The email should:
- Reference the previous quote request (stock #${stockNumber})
- Ask if the dealer can improve their pricing
- Emphasize the buyer is a motivated, serious buyer who has already committed to nmbli.com
- Ask for their best possible out-the-door price
- Mention they're considering multiple dealers
- Request a response within 24 hours
- Be brief and professional (under 150 words)

Return ONLY a JSON object with "subject" and "body" fields. No markdown, no explanations.`;
      break;

    case 'final':
      prompt = `Write a final round email to ${dealerName} for a ${year} ${make} ${model}${trim ? ' ' + trim : ''}.

The email should:
- Reference the previous communications (stock #${stockNumber})
- Mention that we've received quotes from multiple dealers
${lowestPrice ? `- State that the lowest quote received is $${lowestPrice.toLocaleString()}` : ''}
${lowestPrice ? `- Ask if they can beat this price by at least 5% (approximately $${(lowestPrice * 0.95).toLocaleString()})` : '- Ask for their absolute best final offer'}
- Emphasize this is the final round before buyer makes a decision
- Indicate buyer is ready to complete purchase immediately with the winning dealer
- Request a response within 24 hours
- Be brief and professional (under 150 words)

Return ONLY a JSON object with "subject" and "body" fields. No markdown, no explanations.`;
      break;
  }

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const emailData = JSON.parse(jsonText) as QuoteEmailResult;

    // Validate required fields
    if (!emailData.subject || !emailData.body) {
      throw new Error('Invalid email response from Gemini: missing subject or body');
    }

    return emailData;
  } catch (error) {
    console.error('Error generating quote request email:', error);
    throw new Error(`Failed to generate quote request email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
