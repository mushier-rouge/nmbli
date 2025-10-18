import { GoogleGenAI } from '@google/genai';
import { promises as fs } from 'fs';
import path from 'path';

export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

export interface GeminiDealerRecord {
  name: string;
  brand: string;
  city?: string;
  state?: string;
  zipcode?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  source?: string;
  notes?: string;
  driveHours?: number;
  distanceMiles?: number;
}

export interface GeminiDealerResponse {
  dealers: GeminiDealerRecord[];
  sources?: string[];
  notes?: string;
}

export interface GeminiDealerSearchInput {
  zip: string;
  brands: string[];
  driveHours: number;
  limit?: number;
  additionalContext?: string;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
let cachedClient: GoogleGenAI | null = null;
const GEMINI_LOG_FILE = process.env.GEMINI_LOG_FILE ?? path.join(process.cwd(), 'logs', 'gemini.log');

async function writeGeminiLog(payload: Record<string, unknown>) {
  try {
    await fs.mkdir(path.dirname(GEMINI_LOG_FILE), { recursive: true });
    const line = `${new Date().toISOString()} ${JSON.stringify(payload)}\n`;
    await fs.appendFile(GEMINI_LOG_FILE, line, 'utf8');
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[gemini] Failed to write log entry', error);
    }
  }
}

function getClient(): GoogleGenAI {
  if (!cachedClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new GeminiError('GEMINI_API_KEY is not configured');
    }
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

function buildPrompt(input: GeminiDealerSearchInput) {
  const { zip, brands, driveHours, limit, additionalContext } = input;
  const brandLabel = brands.join(', ');
  const maxDealers = limit ?? 8;
  const context = additionalContext ? `\nAdditional buyer notes: ${additionalContext}` : '';

  return `You are researching car dealerships for a buyer. Provide a JSON response only.\nFind up to ${maxDealers} franchised dealerships that sell ${brandLabel} vehicles within approximately ${driveHours} hours driving time of ZIP code ${zip}.\nFor each dealer include: name, brand (franchise), address (street, city, state, zip), phone, general email if readily available, website, approximate driveHours, approximate distanceMiles, and a short notes field with why it is relevant.\nPrefer dealerships with strong inventory, digital retail, or positive buyer reviews.\nIf you are uncertain about a detail, leave the field null rather than guessing.\nReturn JSON with the shape: {"dealers": [ {"name": ..., "brand": ..., "address": ..., "city": ..., "state": ..., "zipcode": ..., "phone": ..., "email": ..., "website": ..., "driveHours": number|null, "distanceMiles": number|null, "notes": ..., "source": ... } ], "sources": ["URL or citation"], "notes": "summary" }.${context}\nRespond with JSON only.`;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeDealerRecord(raw: Record<string, unknown> | null | undefined): GeminiDealerRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.name || !raw.brand) return null;

  return {
    name: String(raw.name).trim(),
    brand: String(raw.brand).trim(),
    city: raw.city ? String(raw.city).trim() : undefined,
    state: raw.state ? String(raw.state).trim() : undefined,
    zipcode: raw.zipcode ? String(raw.zipcode).trim() : undefined,
    address: raw.address ? String(raw.address).trim() : undefined,
    phone: raw.phone ? String(raw.phone).trim() : undefined,
    email: raw.email ? String(raw.email).trim() : undefined,
    website: raw.website ? String(raw.website).trim() : undefined,
    source: raw.source ? String(raw.source).trim() : undefined,
    notes: raw.notes ? String(raw.notes).trim() : undefined,
    driveHours: coerceNumber(raw.driveHours) ?? undefined,
    distanceMiles: coerceNumber(raw.distanceMiles) ?? undefined,
  };
}

export async function geminiSearchDealers(input: GeminiDealerSearchInput): Promise<GeminiDealerResponse> {
  const client = getClient();
  const prompt = buildPrompt(input);
  void writeGeminiLog({
    type: 'request',
    model: DEFAULT_MODEL,
    brands: input.brands,
    zip: input.zip,
    driveHours: input.driveHours,
    limit: input.limit ?? 8,
    additionalContext: input.additionalContext,
    prompt,
  });
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[gemini] Request', {
      model: DEFAULT_MODEL,
      brands: input.brands,
      zip: input.zip,
      driveHours: input.driveHours,
      limit: input.limit ?? 8,
      additionalContext: input.additionalContext,
      prompt: prompt.slice(0, 5000),
    });
  }
  const result = await client.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[gemini] Raw result meta', {
      responseDefined: Boolean(result.response),
      error: (result as { error?: unknown }).error,
    });
    console.debug('[gemini] Full response', JSON.stringify(result, null, 2));
  }
  void writeGeminiLog({ type: 'response', result });

  const combinedText =
    typeof (result as { text?: unknown }).text === 'function'
      ? (result as { text: () => string | undefined }).text()
      : (result as { text?: string }).text;

  if (typeof combinedText !== 'string' || combinedText.trim() === '') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[gemini] Empty response payload', {
        candidates: result.candidates,
        promptFeedback: result.promptFeedback,
        usage: result.usageMetadata,
      });
    }
    const errorPayload = {
      type: 'error',
      message: 'missing_payload',
      candidates: result.candidates,
      promptFeedback: result.promptFeedback,
      usage: result.usageMetadata,
    };
    void writeGeminiLog(errorPayload);
    throw new GeminiError('Gemini response missing JSON payload');
  }

  let candidateJson = combinedText.trim();
  const firstBrace = candidateJson.indexOf('{');
  const lastBrace = candidateJson.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidateJson = candidateJson.slice(firstBrace, lastBrace + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidateJson);
  } catch (error) {
    void writeGeminiLog({
      type: 'error',
      message: 'json_parse_failed',
      rawText: combinedText,
      candidateJson,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[gemini] Failed to parse JSON payload', {
        rawText: combinedText,
        candidateJson,
        error,
      });
    }
    throw new GeminiError('Failed to parse Gemini JSON response');
  }

  if (!parsed || typeof parsed !== 'object' || !('dealers' in parsed)) {
    throw new GeminiError('Gemini response missing dealers list');
  }

  const dealersRaw = Array.isArray((parsed as { dealers: unknown }).dealers)
    ? ((parsed as { dealers: unknown[] }).dealers)
    : [];

  const dealers = dealersRaw
    .map((entry) => normalizeDealerRecord(entry as Record<string, unknown>))
    .filter((entry): entry is GeminiDealerRecord => Boolean(entry));

  return {
    dealers,
    sources: Array.isArray((parsed as { sources?: unknown }).sources)
      ? ((parsed as { sources: unknown[] }).sources.filter((item) => typeof item === 'string') as string[])
      : undefined,
    notes:
      typeof (parsed as { notes?: unknown }).notes === 'string'
        ? String((parsed as { notes: string }).notes)
        : undefined,
  };
}
