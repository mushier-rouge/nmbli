from __future__ import annotations

import asyncio
from typing import Optional

import typer
from rich.console import Console

from .config import build_settings
from .pipeline import sync

app = typer.Typer(help="Nmbli vehicle catalog ETL")
console = Console()


@app.command("sync-vehicles")
def sync_vehicles(
    start_year: int = typer.Option(2015, help="Start year inclusive"),
    end_year: int = typer.Option(2024, help="End year inclusive"),
    database_url: Optional[str] = typer.Option(None, envvar="DATABASE_URL"),
    only_make: Optional[str] = typer.Option(None, help="Filter to a single make"),
    only_year: Optional[int] = typer.Option(None, help="Filter to a single year"),
    dry_run: bool = typer.Option(False, help="Run without writing to database"),
    use_cache: bool = typer.Option(True, help="Use HTTP response cache"),
    dq_report: Optional[str] = typer.Option(None, help="Write DQ report to path"),
):
    if dry_run:
        console.log("[yellow]Dry-run mode: database changes will not be persisted")
    settings = build_settings(
        database_url=database_url,
        start_year=start_year,
        end_year=end_year,
        only_make=only_make,
        only_year=only_year,
        dry_run=dry_run,
        use_cache=use_cache,
        dq_report_path=dq_report,
    )
    asyncio.run(sync(settings))


if __name__ == "__main__":
    app()
