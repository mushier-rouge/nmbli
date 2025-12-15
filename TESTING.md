# Automated Testing Guide

This document explains how to run comprehensive automated tests for the nmbli dealer automation system **without human intervention**.

## Overview

We have four layers of testing:

1. **Unit Tests** - Test individual functions and modules
2. **Integration Tests** - Test how modules work together
3. **E2E Tests** - Test the entire application via HTTP
4. **Manual API Tests** - Call automation API directly

## Quick Start

### 1. Set Up Test Database

```bash
# Seed the database with test users and data
npm run db:seed
```

This creates:
- **Test Users:**
  - `test-buyer@nmbli.com` (buyer role)
  - `test-ops@nmbli.com` (ops role)
- **Test Briefs:**
  - `test-brief-1`: Seattle Toyota Camry
  - `test-brief-2`: LA Honda/Toyota (multi-make)
  - `test-brief-3`: Chicago Mazda CX-5
- **Test Dealerships** with contacts and phone numbers

### 2. Run Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Watch mode for development
npm run test
```

### 2b. Run Smoke Tests (Auth + Brief CRUD)

Use this before deploying or against prod/preview to ensure login/logout and brief creation work end-to-end via the public APIs.

```bash
# Target prod by default; override PLAYWRIGHT_BASE_URL for previews
SMOKE_SUPABASE_SERVICE_ROLE_KEY=... \
SMOKE_TEST_EMAIL=smoke-buyer@nmbli.com \
SMOKE_TEST_PASSWORD=SmokeBuyer123! \
PLAYWRIGHT_NO_SERVER=1 \
PLAYWRIGHT_BASE_URL=https://nmbli.com \
npm run test:smoke
```

What it does:
- Ensures the smoke user exists in Supabase (service role).
- Logs in via `/api/auth/password-login` (sets cookies).
- POSTs `/api/briefs`, GETs `/api/briefs`, DELETEs the created brief.
- Leaves the environment clean.

**Coverage:** 65 tests covering:
- Email template generation
- Dealer discovery logic
- Brief automation workflow
- Contact method routing
- Error handling

### 3. Run E2E Tests

```bash
# Headless mode (for CI/CD)
npm run test:e2e

# Headed mode (see the browser)
npm run test:e2e:headed
```

**What it tests:**
- Automation API endpoint (`/api/briefs/[id]/automate`)
- Brief creation flow
- Dealer discovery
- Error handling

### 4. Run Integration Tests

```bash
# Run integration tests with real database
npm run test:unit -- src/__tests__/integration
```

**What it tests:**
- Full automation workflow
- Email sending
- SMS sending
- Skyvern queueing
- Timeline event recording

## Test the Automation API Directly

### Using curl

```bash
# Trigger automation for test-brief-1
curl -X POST http://localhost:3000/api/briefs/test-brief-1/automate

# Expected response:
{
  "success": true,
  "message": "Automation completed successfully",
  "briefId": "test-brief-1"
}
```

### Using Playwright Test

```bash
npx playwright test e2e/automation.spec.ts
```

### Check Results

```bash
# View timeline events
psql $DATABASE_URL -c "SELECT * FROM \"TimelineEvent\" WHERE \"briefId\" = 'test-brief-1' ORDER BY \"createdAt\" DESC;"

# View email messages sent
psql $DATABASE_URL -c "SELECT * FROM \"EmailMessage\" WHERE \"briefId\" = 'test-brief-1';"

# View SMS messages sent
psql $DATABASE_URL -c "SELECT * FROM \"SmsMessage\" WHERE \"briefId\" = 'test-brief-1';"

# View Skyvern runs queued
psql $DATABASE_URL -c "SELECT * FROM \"SkyvernRun\" WHERE \"briefId\" = 'test-brief-1';"
```

## Environment Setup

### Required Environment Variables

For full automation testing, set these in your `.env.local`:

```bash
# Gemini API (for dealer discovery)
GEMINI_API_KEY=your_key_here

# Gmail API (for email automation)
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_FROM_EMAIL=contact@nmbli.com

# Twilio (for SMS automation)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_phone

# Database
DATABASE_URL=your_database_url
```

### Test Mode (Without Real API Calls)

If you don't have API keys, the tests will use mocked services:
- Gemini API → Returns mock dealer data
- Gmail → Logs emails instead of sending
- Twilio → Logs SMS instead of sending

The automation logic will still run and you can verify:
- Dealers are created in database
- Timeline events are recorded
- Brief status is updated

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - run: npm run db:generate
      
      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Seed database
        run: npm run db:seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          PLAYWRIGHT_BASE_URL: http://localhost:3000
```

## Testing Scenarios

### Scenario 1: Test Email Automation

```bash
# 1. Seed database
npm run db:seed

# 2. Trigger automation (will use test dealer with email)
curl -X POST http://localhost:3000/api/briefs/test-brief-1/automate

# 3. Check emails sent
psql $DATABASE_URL -c "
  SELECT 
    \"toEmail\", 
    subject, 
    status, 
    \"createdAt\"
  FROM \"EmailMessage\" 
  WHERE \"briefId\" = 'test-brief-1'
  ORDER BY \"createdAt\" DESC;
"
```

### Scenario 2: Test Multi-Make Discovery

```bash
# Test brief 2 has both Honda and Toyota
curl -X POST http://localhost:3000/api/briefs/test-brief-2/automate

# Check dealers discovered
psql $DATABASE_URL -c "
  SELECT make, COUNT(*) 
  FROM \"Dealership\" 
  WHERE state = 'WA' 
  GROUP BY make;
"
```

### Scenario 3: Test Error Handling

```bash
# Test with invalid brief ID
curl -X POST http://localhost:3000/api/briefs/invalid-id/automate

# Expected: 404 error
{
  "error": "Brief not found"
}
```

## Debugging Tests

### View Test Output

```bash
# Run tests with verbose logging
npm run test:unit -- --reporter=verbose

# Run specific test file
npm run test:unit -- src/__tests__/services/brief-automation.spec.ts

# Run with coverage
npm run test:unit -- --coverage
```

### Playwright Debugging

```bash
# Run with UI mode
npx playwright test --ui

# Debug specific test
npx playwright test --debug e2e/automation.spec.ts

# Generate HTML report
npx playwright show-report
```

## Resetting Test Data

```bash
# Clear all test data
psql $DATABASE_URL -c "DELETE FROM \"TimelineEvent\" WHERE \"briefId\" LIKE 'test-brief-%';"
psql $DATABASE_URL -c "DELETE FROM \"EmailMessage\" WHERE \"briefId\" LIKE 'test-brief-%';"
psql $DATABASE_URL -c "DELETE FROM \"SmsMessage\" WHERE \"briefId\" LIKE 'test-brief-%';"
psql $DATABASE_URL -c "DELETE FROM \"SkyvernRun\" WHERE \"briefId\" LIKE 'test-brief-%';"
psql $DATABASE_URL -c "DELETE FROM \"Brief\" WHERE id LIKE 'test-brief-%';"
psql $DATABASE_URL -c "DELETE FROM \"Dealership\" WHERE id LIKE 'test-dealer-%';"
psql $DATABASE_URL -c "DELETE FROM \"User\" WHERE email LIKE 'test-%@nmbli.com';"

# Re-seed
npm run db:seed
```

## Best Practices

1. **Always seed before testing** - Run `npm run db:seed`
2. **Use test data** - Don't test with production briefs
3. **Check all outputs** - Verify timeline events, emails, SMS, Skyvern runs
4. **Test error paths** - Try invalid inputs
5. **Monitor costs** - Use mock services when possible

## Troubleshooting

### Tests Failing?

1. **Check database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Verify seed data:**
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM \"User\" WHERE email LIKE 'test-%';"
   ```

3. **Check environment variables:**
   ```bash
   printenv | grep -E '(GEMINI|GMAIL|TWILIO|DATABASE)'
   ```

4. **View test logs:**
   ```bash
   npm run test:unit -- --reporter=verbose
   ```

### E2E Tests Timing Out?

- Increase timeout in `playwright.config.ts`
- Check if dev server is running: `http://localhost:3000`
- Verify database is accessible

### Integration Tests Failing?

- Ensure real database connection (not test mocks)
- Run migrations: `npm run db:migrate`
- Seed test data: `npm run db:seed`

## Next Steps

Once automated testing is working:

1. **Set up CI/CD** - Run tests on every commit
2. **Add monitoring** - Track test success rates
3. **Expand coverage** - Add more test scenarios
4. **Performance testing** - Test with high volumes
5. **Security testing** - Test auth and permissions

## Support

Questions? Check:
- `docs/ARCHITECTURE.md` - System architecture
- `docs/ROADMAP.md` - Implementation roadmap
- GitHub Issues - Report bugs/requests
