// Global test setup - runs before all tests
//Set environment variables needed by modules that instantiate clients at import time

// Gemini API
process.env.GEMINI_API_KEY = 'test-gemini-api-key';

// Gmail API
process.env.GMAIL_CLIENT_ID = 'test-gmail-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-gmail-client-secret';
process.env.GMAIL_REFRESH_TOKEN = 'test-gmail-refresh-token';
process.env.GMAIL_FROM_EMAIL = 'quotes@nmbli.com';

// Twilio
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-account-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-auth-token';
process.env.TWILIO_PHONE_NUMBER = '+15551234567';

// Database
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
