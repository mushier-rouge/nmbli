from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class Settings:
    database_url: str
    start_year: int
    end_year: int
    only_make: Optional[str] = None
    only_year: Optional[int] = None
    dry_run: bool = False
    cache_dir: str = os.path.join(os.getcwd(), "etl", "cache")
    reports_dir: str = os.path.join(os.getcwd(), "etl", "reports")
    use_cache: bool = True
    max_workers: int = int(os.getenv("MAX_WORKERS", "8"))
    http_timeout: float = float(os.getenv("HTTP_TIMEOUT", "20"))
    dq_report_path: Optional[str] = None


def build_settings(
    *,
    database_url: Optional[str],
    start_year: int,
    end_year: int,
    only_make: Optional[str],
    only_year: Optional[int],
    dry_run: bool,
    use_cache: bool,
    dq_report_path: Optional[str],
) -> Settings:
    db_url = database_url or os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL must be provided via flag or environment variable")
    return Settings(
        database_url=db_url,
        start_year=start_year,
        end_year=end_year,
        only_make=only_make,
        only_year=only_year,
        dry_run=dry_run,
        use_cache=use_cache,
        dq_report_path=dq_report_path,
    )
