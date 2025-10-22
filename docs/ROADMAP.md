# Nmbli Roadmap & Implementation Plan

**Last Updated:** October 21, 2025

## Current Status

✅ **Phase 0: Foundation (COMPLETE)**
- Buyer brief creation flow
- Vehicle data and selection UI
- Authentication system
- Database schema and ORM setup
- Testing infrastructure with pre-commit hooks

## Immediate Next Steps: Dealer Automation

### Phase 1: Dealer Discovery & Contact Collection

**Goal:** Find dealers in buyer's state and build a contact database to reduce Skyvern costs.

#### 1.1 Gemini API Integration for Dealer Discovery

**Task:** Use Gemini API to find 10-15 dealers in user's state

**Implementation Steps:**
1. Create Gemini API client
   - File: `src/lib/api/gemini.ts`
   - Environment variable: `GEMINI_API_KEY`
   - Function: `findDealersInState(make: string, state: string): Promise<Dealer[]>`

2. Prompt engineering
   ```
   Find 10-15 authorized {make} dealerships in {state}.
   For each dealer, return:
   - Dealership name
   - Address
   - Phone number
   - Website
   - Email (sales department)
   ```

3. Parse and validate response
   - Create Zod schema for dealer data
   - Validate and sanitize responses
   - Handle API errors and retries

4. Store in database
   - New table: `dealerships`
   ```sql
   CREATE TABLE dealerships (
     id UUID PRIMARY KEY,
     name TEXT NOT NULL,
     make TEXT NOT NULL,
     state TEXT NOT NULL,
     city TEXT,
     address TEXT,
     phone TEXT,
     website TEXT,
     email TEXT,
     discovered_at TIMESTAMP DEFAULT NOW(),
     verified BOOLEAN DEFAULT FALSE,
     last_contacted_at TIMESTAMP
   );
   ```

**Files to Create:**
- `src/lib/api/gemini.ts` - Gemini API client
- `src/lib/services/dealer-discovery.ts` - Discovery business logic
- `prisma/migrations/xxx_add_dealerships.sql` - Migration
- `src/__tests__/services/dealer-discovery.spec.ts` - Tests

**Estimated Time:** 4-6 hours

---

#### 1.2 Contact Database for Sales People

**Task:** Record all sales contact emails from dealerships to avoid Skyvern costs

**Implementation Steps:**
1. Database schema
   ```sql
   CREATE TABLE dealer_contacts (
     id UUID PRIMARY KEY,
     dealership_id UUID REFERENCES dealerships(id),
     name TEXT,
     email TEXT UNIQUE NOT NULL,
     phone TEXT,
     role TEXT, -- 'sales', 'manager', 'internet_sales'
     first_contacted_at TIMESTAMP DEFAULT NOW(),
     last_contacted_at TIMESTAMP,
     total_interactions INTEGER DEFAULT 0,
     preferred_contact_method TEXT, -- 'email', 'sms', 'phone'
     notes JSONB
   );
   ```

2. Contact extraction from interactions
   - Parse emails for sender info
   - Extract from Skyvern responses
   - Manual entry UI for ops team

3. Contact deduplication
   - Email normalization
   - Fuzzy matching on names
   - Merge duplicate contacts

**Files to Create:**
- `prisma/migrations/xxx_add_dealer_contacts.sql`
- `src/lib/services/contacts.ts` - Contact management
- `src/app/ops/contacts/page.tsx` - Ops UI for contact management

**Estimated Time:** 3-4 hours

---

### Phase 2: Skyvern Integration

**Task:** Automate dealer website quote requests using Skyvern

#### 2.1 Skyvern Setup

**Implementation Steps:**
1. Install Skyvern SDK
   ```bash
   npm install skyvern-sdk
   ```

2. Configure Skyvern client
   - File: `src/lib/automation/skyvern.ts`
   - Environment variable: `SKYVERN_API_KEY`
   - Webhook for async results

3. Create workflow templates
   - Generic dealer quote request flow
   - Make-specific templates (Toyota, Honda, etc.)
   - Handle multi-step forms
   - Screenshot collection for verification

4. Track Skyvern usage
   ```sql
   CREATE TABLE skyvern_runs (
     id UUID PRIMARY KEY,
     brief_id UUID REFERENCES briefs(id),
     dealership_id UUID REFERENCES dealerships(id),
     workflow_id TEXT,
     status TEXT, -- 'pending', 'running', 'success', 'failed'
     cost_cents INTEGER,
     started_at TIMESTAMP,
     completed_at TIMESTAMP,
     result JSONB, -- extracted data
     screenshots JSONB, -- URLs to screenshots
     error_message TEXT
   );
   ```

**Files to Create:**
- `src/lib/automation/skyvern.ts` - Skyvern client
- `src/lib/automation/workflows/` - Workflow templates
- `src/lib/services/automation.ts` - Automation orchestration
- `prisma/migrations/xxx_add_skyvern_runs.sql`

**Estimated Time:** 6-8 hours

---

#### 2.2 Contact Prioritization

**Task:** Use known contacts first, fall back to Skyvern only when needed

**Implementation Steps:**
1. Dealer contact lookup
   ```typescript
   async function getContactMethod(dealership: Dealership): Promise<ContactMethod> {
     // 1. Check if we have a known sales contact
     const contact = await prisma.dealerContact.findFirst({
       where: { dealership_id: dealership.id },
       orderBy: { last_contacted_at: 'desc' }
     });

     if (contact) {
       return { type: 'email', contact };
     }

     // 2. Check if we have dealership email
     if (dealership.email) {
       return { type: 'email', email: dealership.email };
     }

     // 3. Fall back to Skyvern
     return { type: 'skyvern', dealership };
   }
   ```

2. Cost tracking
   - Log every automation attempt
   - Track cost savings from direct contacts
   - Alert when Skyvern budget exceeds threshold

**Files to Create:**
- `src/lib/services/outreach-strategy.ts` - Contact selection logic
- `src/app/ops/automation-stats/page.tsx` - Cost tracking dashboard

**Estimated Time:** 3-4 hours

---

### Phase 3: Gmail Integration

**Task:** Send and receive emails via Gmail Workspace API

#### 3.1 Gmail API Setup

**Implementation Steps:**
1. Google Cloud Console setup
   - Create project
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Configure consent screen

2. Gmail SDK integration
   ```bash
   npm install @googleapis/gmail
   ```

3. Create Gmail client
   - File: `src/lib/email/gmail.ts`
   - OAuth flow for workspace account
   - Token storage in database
   ```sql
   CREATE TABLE email_accounts (
     id UUID PRIMARY KEY,
     provider TEXT NOT NULL, -- 'gmail', 'sendgrid'
     email TEXT UNIQUE NOT NULL,
     access_token TEXT,
     refresh_token TEXT,
     token_expires_at TIMESTAMP,
     is_active BOOLEAN DEFAULT TRUE
   );
   ```

4. Email sending
   ```typescript
   async function sendQuoteRequest(params: {
     to: string;
     brief: Brief;
     dealership: Dealership;
   }): Promise<void>
   ```

5. Email receiving & parsing
   - Webhook for new emails
   - Parse quote responses
   - Extract contact information
   - Auto-create dealer_contact records

**Files to Create:**
- `src/lib/email/gmail.ts` - Gmail API client
- `src/lib/email/templates/` - Email templates
- `src/app/api/webhooks/gmail/route.ts` - Gmail webhook
- `src/lib/services/email-parser.ts` - Parse quote emails
- `prisma/migrations/xxx_add_email_accounts.sql`

**Estimated Time:** 8-10 hours

---

#### 3.2 Email Templates

**Implementation Steps:**
1. Create quote request template
   ```typescript
   interface QuoteRequestTemplate {
     subject: string;
     body: string; // HTML email
     variables: {
       dealerName: string;
       buyerName: string;
       make: string;
       model: string;
       trim?: string;
       zipcode: string;
       timeline: string;
     };
   }
   ```

2. Create follow-up templates
   - No response after 24 hours
   - No response after 48 hours
   - Thank you for quote
   - Request clarification

3. Template testing
   - Preview UI for ops team
   - A/B testing capability
   - Response rate tracking

**Files to Create:**
- `src/lib/email/templates/quote-request.tsx` - React Email template
- `src/lib/email/templates/follow-up.tsx`
- `src/app/ops/email-templates/page.tsx` - Template management UI

**Estimated Time:** 4-5 hours

---

### Phase 4: Twilio Integration (SMS)

**Task:** Send SMS messages for high-priority or time-sensitive requests

#### 4.1 Twilio Setup

**Implementation Steps:**
1. Twilio account setup
   - Purchase phone number
   - Configure messaging service
   - Set up webhooks

2. Twilio SDK integration
   ```bash
   npm install twilio
   ```

3. Create SMS client
   - File: `src/lib/sms/twilio.ts`
   - Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

4. SMS sending
   ```typescript
   async function sendQuoteRequestSMS(params: {
     to: string;
     brief: Brief;
     dealership: Dealership;
   }): Promise<void>
   ```

5. SMS receiving
   - Webhook for incoming messages
   - Parse responses
   - Link to brief/dealer conversation

6. Track SMS usage
   ```sql
   CREATE TABLE sms_messages (
     id UUID PRIMARY KEY,
     brief_id UUID REFERENCES briefs(id),
     dealership_id UUID REFERENCES dealerships(id),
     contact_id UUID REFERENCES dealer_contacts(id),
     direction TEXT NOT NULL, -- 'outbound', 'inbound'
     to_number TEXT,
     from_number TEXT,
     body TEXT,
     status TEXT, -- 'sent', 'delivered', 'failed'
     cost_cents INTEGER,
     sent_at TIMESTAMP DEFAULT NOW(),
     twilio_sid TEXT
   );
   ```

**Files to Create:**
- `src/lib/sms/twilio.ts` - Twilio client
- `src/app/api/webhooks/twilio/route.ts` - SMS webhook
- `src/lib/services/sms-parser.ts` - Parse SMS responses
- `prisma/migrations/xxx_add_sms_messages.sql`

**Estimated Time:** 5-6 hours

---

### Phase 5: Orchestration & Workflow

**Task:** Coordinate all automation systems into a cohesive workflow

#### 5.1 Brief-to-Quote Automation

**Implementation Steps:**
1. Create automation workflow engine
   ```typescript
   class BriefAutomation {
     async process(brief: Brief): Promise<void> {
       // 1. Discover dealers
       const dealers = await this.discoverDealers(brief);

       // 2. For each dealer, select best contact method
       for (const dealer of dealers) {
         const method = await this.selectContactMethod(dealer);

         // 3. Send quote request
         if (method.type === 'email') {
           await this.sendEmailRequest(brief, dealer, method.contact);
         } else if (method.type === 'sms') {
           await this.sendSMSRequest(brief, dealer, method.contact);
         } else if (method.type === 'skyvern') {
           await this.runSkyvern(brief, dealer);
         }

         // 4. Schedule follow-ups
         await this.scheduleFollowUp(brief, dealer);
       }
     }
   }
   ```

2. State machine for brief lifecycle
   ```
   created → discovering_dealers → contacting_dealers →
   awaiting_quotes → quotes_received → buyer_review → completed
   ```

3. Background job processing
   - Use Vercel Cron or Inngest
   - Queue system for rate limiting
   - Retry logic for failures

4. Timeline events for transparency
   - Log every automation action
   - Buyer can see what's happening
   - Ops team can debug issues

**Files to Create:**
- `src/lib/automation/orchestrator.ts` - Main workflow
- `src/lib/automation/state-machine.ts` - Brief state management
- `src/lib/jobs/` - Background jobs
- `src/app/api/cron/process-briefs/route.ts` - Cron endpoint

**Estimated Time:** 8-10 hours

---

#### 5.2 Quote Parsing & Storage

**Implementation Steps:**
1. Quote extraction from emails/Skyvern
   - Parse structured data (price, fees, etc.)
   - Handle PDF attachments
   - OCR for images
   - Validate quote completeness

2. Quote normalization
   - Standardize line items
   - Calculate true OTD price
   - Flag missing information
   - Detect hidden fees

3. Store in database
   - Link to brief and dealer
   - Create timeline event
   - Notify buyer

**Files to Create:**
- `src/lib/services/quote-parser.ts` - Extract quote data
- `src/lib/services/quote-validator.ts` - Validate completeness
- `src/lib/services/pdf-parser.ts` - Parse PDF quotes
- `src/__tests__/services/quote-parser.spec.ts`

**Estimated Time:** 6-8 hours

---

### Phase 6: Buyer Experience

**Task:** Show automation progress and collected quotes to buyers

#### 6.1 Real-time Updates

**Implementation Steps:**
1. Brief status page with live updates
   - Show dealers being contacted
   - Show quotes as they arrive
   - Show automated actions timeline

2. Email notifications
   - "We're contacting dealers for you"
   - "New quote received from {dealer}"
   - "All quotes collected - review now"

3. Quote comparison UI
   - Side-by-side comparison
   - Highlight best price
   - Show line-item differences
   - Red flags for suspicious fees

**Files to Create:**
- `src/app/briefs/[id]/status/page.tsx` - Live status page
- `src/components/brief/quote-comparison.tsx` - Comparison UI
- `src/lib/email/buyer-notifications.ts` - Buyer emails

**Estimated Time:** 6-8 hours

---

## Implementation Timeline

### Week 1: Dealer Discovery & Contacts
- Day 1-2: Gemini API integration
- Day 3-4: Contact database
- Day 5: Testing & refinement

### Week 2: Email Integration
- Day 1-3: Gmail API setup
- Day 4-5: Email templates & sending
- Day 6-7: Email parsing & webhooks

### Week 3: Automation & Skyvern
- Day 1-3: Skyvern integration
- Day 4-5: Contact prioritization
- Day 6-7: Testing & optimization

### Week 4: SMS & Orchestration
- Day 1-2: Twilio setup
- Day 3-5: Workflow orchestration
- Day 6-7: Quote parsing

### Week 5: Buyer Experience & Polish
- Day 1-3: Status updates & notifications
- Day 4-5: Quote comparison UI
- Day 6-7: End-to-end testing

**Total Estimated Time:** 5 weeks

---

## Cost Estimates

### APIs & Services
- **Gemini API:** ~$0.001-0.005 per dealer discovery request
- **Skyvern:** $0.50-2.00 per automation (reduce over time with contacts)
- **Gmail API:** Free (workspace account)
- **Twilio SMS:** $0.0075 per SMS sent
- **Vercel:** Current plan sufficient
- **Supabase:** Current plan sufficient

### Monthly Operating Cost (100 briefs/month)
- Gemini: $5-10
- Skyvern (first month): $500-2,000
- Skyvern (after contacts): $50-200
- Twilio: $10-30
- **Total:** $65-240/month (decreasing over time)

---

## Success Metrics

1. **Automation Rate:** % of quote requests sent automatically
2. **Contact Database Growth:** # of dealer contacts collected
3. **Skyvern Cost Reduction:** Monthly savings from direct contacts
4. **Quote Response Rate:** % of dealers who respond
5. **Time to Quotes:** Hours from brief creation to first quote
6. **Quote Quality:** % of quotes that are complete/valid
7. **Buyer Satisfaction:** NPS score

---

## Risk Mitigation

1. **Skyvern Failures:** Always have manual fallback for ops team
2. **API Rate Limits:** Implement queuing and rate limiting
3. **Email Deliverability:** Use workspace domain, monitor bounce rates
4. **Contact Quality:** Verify contacts before mass outreach
5. **Privacy/Spam:** Clear opt-in/opt-out, CAN-SPAM compliance
6. **Cost Overruns:** Budget alerts, automatic throttling

---

## Future Enhancements (Post-Phase 6)

- AI-powered quote negotiation
- Dealer relationship scoring
- Buyer preference learning
- Multi-language support
- Mobile app
- Dealer portal for direct integration
- Finance pre-approval integration
- Trade-in valuation automation

---

**Status:** Ready to begin Phase 1
**Next Action:** Set up Gemini API and create dealer discovery service
