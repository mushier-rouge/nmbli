from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path
from typing import Dict, Iterable, List

from rich.console import Console

console = Console()


def write_report(path: Path, rows: Iterable[Dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = list(rows)
    if not rows:
        console.log(f"[green]No anomalies detected; skipping report {path}")
        return
    fieldnames = sorted({key for row in rows for key in row.keys()})
    with path.open("w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    console.log(f"[yellow]Wrote DQ report to {path} ({len(rows)} anomalies)")


def default_report_path(reports_dir: Path) -> Path:
    timestamp = dt.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return reports_dir / f"dq_{timestamp}.csv"
