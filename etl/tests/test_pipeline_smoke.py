import os
import asyncio
import pytest

from etl.config import build_settings
from etl.pipeline import sync

pytestmark = pytest.mark.skipif("DATABASE_URL" not in os.environ, reason="requires DATABASE_URL")


@pytest.mark.asyncio
async def test_sync_smoke(monkeypatch):
    settings = build_settings(
        database_url=os.environ.get("DATABASE_URL"),
        start_year=2023,
        end_year=2023,
        only_make="Toyota",
        only_year=2023,
        dry_run=False,
        use_cache=True,
        dq_report_path=None,
    )
    await sync(settings)
