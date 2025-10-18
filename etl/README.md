# Nmbli Vehicle Catalog ETL

This project builds and maintains a US-only make/model/trim database for passenger vehicles using free data sources (NHTSA vPIC, CarQuery, and FuelEconomy.gov).

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ./etl[test]
export DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
python -m etl.cli sync-vehicles --start-year 2015 --end-year 2024 --use-cache
```

The first run fetches from public APIs and writes results into the Postgres schema defined in `sql/001_schema.sql`. Subsequent runs are idempotent: rows are upserted and missing trims are marked inactive.

## Features

- Normalized tables (`makes`, `models`, `trims`, `trim_evidence`).
- Async data fetch with caching, retries, and rate limiting.
- Deterministic normalization rules (make aliases, trim cleanup). 
- DOE cross-checks with anomaly report (`etl/reports`).
- CLI with filters (`--only-make`, `--only-year`), dry-run mode, and custom cache/report directories.
- Tests for normalization and parsers; smoke test ensures idempotent pipeline runs.

## Modules

```
etl/src/etl/
  cli.py         # Typer CLI
  config.py      # Settings builder
  db.py          # SQLAlchemy helpers and upserts
  dq.py          # Data quality reporting
  http.py        # Async client with caching and retries
  normalize.py   # Deterministic normalization helpers
  pipeline.py    # Orchestrates year/make/model/trim sync
  sources/
    carquery.py  # CarQuery fetch/mapping
    doe.py       # FuelEconomy cross-check
    vpic.py      # NHTSA vPIC fetch/mapping
```

## Make targets

```
make install   # install dependencies
make format    # run formatting (ruff/black) [future]
make test      # run pytest suite
make sync      # run full sync for 2015..present (requires DATABASE_URL)
```

## Upgrading to commercial catalogs

- Preserve normalized keys (`normalized_name`, `normalized_trim_name`).
- Add vendor-specific IDs as `source_key` values.
- Extend `trim_evidence` with the vendor payload for auditing.

## Notes

- Cache files live in `etl/cache` (gitignored).
- Data-quality reports write to `etl/reports` by default.
- Rate limiting is conservative (semaphores + exponential backoff). Adjust via environment variables if needed.
