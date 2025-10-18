PYTHON ?= python
PIP ?= pip

.PHONY: install test sync schema

install:
	$(PIP) install -e .[test]

test:
	pytest -q

sync:
	$(PYTHON) -m etl.cli sync-vehicles --start-year 2015 --end-year `date +%Y`

schema:
	psql $$DATABASE_URL -f sql/001_schema.sql
