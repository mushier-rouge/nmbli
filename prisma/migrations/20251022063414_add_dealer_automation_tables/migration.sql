-- Dealerships table
CREATE TABLE dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  make TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT,
  address TEXT,
  zipcode TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  discovered_at TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  last_contacted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dealerships_make_state ON dealerships(make, state);

-- Dealer contacts
CREATE TABLE dealer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'sales',
  first_contacted_at TIMESTAMP DEFAULT NOW(),
  last_contacted_at TIMESTAMP,
  total_interactions INTEGER DEFAULT 0,
  preferred_contact_method TEXT DEFAULT 'email',
  notes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dealer_contacts_email ON dealer_contacts(email);

-- Skyvern runs
CREATE TABLE skyvern_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES briefs(id) ON DELETE CASCADE,
  dealership_id UUID REFERENCES dealerships(id) ON DELETE SET NULL,
  workflow_id TEXT,
  status TEXT DEFAULT 'pending',
  cost_cents INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  result JSONB,
  screenshots JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email/SMS tracking
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES briefs(id) ON DELETE CASCADE,
  dealership_id UUID REFERENCES dealerships(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES dealer_contacts(id) ON DELETE SET NULL,
  direction TEXT NOT NULL,
  to_email TEXT,
  from_email TEXT,
  subject TEXT,
  body_html TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP DEFAULT NOW(),
  gmail_message_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES briefs(id) ON DELETE CASCADE,
  dealership_id UUID REFERENCES dealerships(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES dealer_contacts(id) ON DELETE SET NULL,
  direction TEXT NOT NULL,
  to_number TEXT,
  from_number TEXT,
  body TEXT,
  status TEXT DEFAULT 'sent',
  cost_cents INTEGER DEFAULT 0,
  sent_at TIMESTAMP DEFAULT NOW(),
  twilio_sid TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
