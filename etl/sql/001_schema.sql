CREATE TABLE IF NOT EXISTS makes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL UNIQUE,
  country TEXT,
  source TEXT NOT NULL,
  source_key TEXT,
  last_verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS models (
  id SERIAL PRIMARY KEY,
  make_id INT NOT NULL REFERENCES makes(id),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  first_year INT,
  last_year INT,
  source TEXT NOT NULL,
  source_key TEXT,
  last_verified_at TIMESTAMPTZ,
  UNIQUE (make_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS trims (
  id SERIAL PRIMARY KEY,
  model_id INT NOT NULL REFERENCES models(id),
  year INT NOT NULL,
  trim_name TEXT NOT NULL,
  normalized_trim_name TEXT NOT NULL,
  body TEXT,
  doors INT,
  drive TEXT,
  transmission TEXT,
  fuel_type TEXT,
  market TEXT NOT NULL DEFAULT 'US',
  source TEXT NOT NULL,
  source_key TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ,
  UNIQUE (model_id, year, normalized_trim_name)
);

CREATE TABLE IF NOT EXISTS trim_evidence (
  id BIGSERIAL PRIMARY KEY,
  trim_id INT REFERENCES trims(id),
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  observed_at TIMESTAMPTZ DEFAULT NOW()
);
