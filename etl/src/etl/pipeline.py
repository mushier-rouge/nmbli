from __future__ import annotations

import asyncio
import datetime as dt
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from rich.console import Console

from .config import Settings
from .db import (
    get_engine,
    upsert_make,
    upsert_model,
    upsert_trim,
    insert_trim_evidence,
    mark_trims_inactive,
    get_model_id,
    get_make_id,
)
from .dq import default_report_path, write_report
from .http import create_client
from .normalize import normalize_make_name, normalized_key, collapse_spaces
from .sources import carquery, vpic, doe
from .sources.carquery import CarQueryError

CARQUERY_PAUSE_SECONDS = 0.05


def _dedupe_preserve(sequence: List[str]) -> List[str]:
    seen = set()
    result: List[str] = []
    for item in sequence:
        if not item:
            continue
        key = collapse_spaces(item)
        if not key:
            continue
        lower = key.lower()
        if lower in seen:
            continue
        seen.add(lower)
        result.append(key)
    return result


def _model_aliases(name: str) -> List[str]:
    base = collapse_spaces(name) or ""
    variants = [
        base,
        base.replace("-", " "),
        base.replace(" ", "-"),
        base.replace("/", " "),
        base.replace("’", "'"),
    ]
    if "(" in base:
        variants.append(base.split("(")[0])
    return _dedupe_preserve(variants)


async def _fetch_carquery_models(client: HTTPClient, make_candidates: List[str], year: int) -> tuple[List[Dict[str, Any]], Optional[str]]:
    for make in _dedupe_preserve(make_candidates):
        try:
            models = await carquery.get_models(client, make, year, sold_in_us=True)
            await asyncio.sleep(CARQUERY_PAUSE_SECONDS)
        except CarQueryError as exc:
            if "denied" in str(exc).lower():
                raise
            continue
        if not models:
            try:
                models = await carquery.get_models(client, make, year, sold_in_us=False)
                await asyncio.sleep(CARQUERY_PAUSE_SECONDS)
            except CarQueryError as exc:
                if "denied" in str(exc).lower():
                    raise
                continue
        if models:
            return models, make
    return [], None


async def _fetch_carquery_trims(
    client: HTTPClient,
    make_candidates: List[str],
    model_candidates: List[str],
    year: int,
) -> List[carquery.CarQueryTrim]:
    seen: Set[tuple[str, str, bool]] = set()
    for make in _dedupe_preserve(make_candidates):
        for sold_in_us in (True, False):
            for model in _dedupe_preserve(model_candidates):
                key = (make.lower(), model.lower(), sold_in_us)
                if key in seen:
                    continue
                seen.add(key)
                try:
                    trims = await carquery.get_trims(client, make, model, year, sold_in_us=sold_in_us)
                    await asyncio.sleep(CARQUERY_PAUSE_SECONDS)
                except CarQueryError as exc:
                    if "denied" in str(exc).lower():
                        raise
                    continue
                if trims:
                    return trims
    return []

console = Console()


class SyncStats:
    def __init__(self) -> None:
        self.makes_upserted = 0
        self.models_upserted = 0
        self.trims_upserted = 0


async def sync(settings: Settings) -> None:
    engine = get_engine(settings.database_url)
    client = await create_client(settings.http_timeout, settings.cache_dir, settings.use_cache)
    anomalies: List[Dict[str, str]] = []
    stats = SyncStats()

    try:
        years = list(range(settings.start_year, settings.end_year + 1))
        if settings.only_year:
            years = [settings.only_year]
        for year in years:
            console.rule(f"Syncing year {year}")
            year_anomalies = await sync_year(year, settings, engine, client, stats)
            anomalies.extend(year_anomalies)
    finally:
        await client.aclose()

    report_path = settings.dq_report_path
    if not report_path and anomalies:
        report_path = str(default_report_path(Path(settings.reports_dir)))
    if report_path:
        write_report(Path(report_path), anomalies)

    console.rule("Sync complete")
    console.log(f"Makes upserted: {stats.makes_upserted}")
    console.log(f"Models upserted: {stats.models_upserted}")
    console.log(f"Trims upserted: {stats.trims_upserted}")


async def sync_year(
    year: int,
    settings: Settings,
    engine,
    client,
    stats: SyncStats,
) -> List[Dict[str, str]]:
    anomalies: List[Dict[str, str]] = []

    try:
        doe_make_names = await doe.get_makes(client, year)
    except Exception as exc:
        console.log(f"[red]DOE makes fetch failed for {year}: {exc}")
        anomalies.append({"type": "doe_fetch_failed", "year": str(year), "detail": str(exc)})
        doe_make_names = []

    try:
        carquery_makes = await carquery.get_makes(client, year)
    except CarQueryError as exc:
        console.log(f"[yellow]CarQuery get_makes failed for {year}: {exc}")
        carquery_makes = []

    carquery_make_map: Dict[str, Dict[str, Any]] = {}
    for item in carquery_makes:
        make_name = collapse_spaces(item.get("make_display") or item.get("make_name"))
        if not make_name:
            continue
        carquery_make_map[normalized_key(normalize_make_name(make_name))] = item

    make_entries: List[Dict[str, Any]] = []
    for name in doe_make_names:
        canonical = normalize_make_name(name)
        normalized_make = normalized_key(canonical)
        if settings.only_make and normalized_key(settings.only_make) != normalized_make:
            continue
        make_entries.append(
            {
                "canonical": canonical,
                "normalized": normalized_make,
                "original": name,
                "carquery": carquery_make_map.get(normalized_make),
            }
        )

    if not make_entries:
        for item in carquery_makes:
            make_name = collapse_spaces(item.get("make_display") or item.get("make_name"))
            if not make_name:
                continue
            canonical = normalize_make_name(make_name)
            normalized_make = normalized_key(canonical)
            if settings.only_make and normalized_key(settings.only_make) != normalized_make:
                continue
            make_entries.append(
                {
                    "canonical": canonical,
                    "normalized": normalized_make,
                    "original": make_name,
                    "carquery": item,
                }
            )

    if not make_entries:
        anomalies.append({"type": "no_makes", "year": str(year)})
        return anomalies

    doe_models_cache: Dict[str, Set[str]] = {}

    for entry in make_entries:
        canonical_make = entry["canonical"]
        normalized_make = entry["normalized"]
        original_name = entry["original"]
        cq_item = entry["carquery"]

        make_candidates = []
        if cq_item:
            for key in (cq_item.get("make_name"), cq_item.get("make_id"), cq_item.get("make_display")):
                if key:
                    make_candidates.append(key)
        make_candidates.extend([
            original_name,
            canonical_make,
            canonical_make.lower(),
            canonical_make.replace(" ", "-"),
            canonical_make.replace("-", " "),
        ])
        make_candidates = _dedupe_preserve(make_candidates)

        try:
            carquery_models, carquery_make_used = await _fetch_carquery_models(client, make_candidates, year)
        except CarQueryError as exc:
            console.log(f"[yellow]CarQuery models denied for {canonical_make} {year}: {exc}")
            carquery_models, carquery_make_used = [], None

        try:
            vpic_models = await vpic.get_models_for_make_year(client, canonical_make, year)
        except Exception as exc:
            console.log(f"[yellow]VPIC models fetch failed for {canonical_make} {year}: {exc}")
            vpic_models = []

        vpic_norms = {
            normalized_key(collapse_spaces(model.get("Model_Name")))
            for model in vpic_models
            if collapse_spaces(model.get("Model_Name"))
        }

        if normalized_make not in doe_models_cache and doe_make_names:
            try:
                doe_models = await doe.get_models(client, year, original_name)
                await asyncio.sleep(CARQUERY_PAUSE_SECONDS)
            except Exception as exc:
                anomalies.append(
                    {
                        "type": "doe_models_fetch_failed",
                        "year": str(year),
                        "make": canonical_make,
                        "detail": str(exc),
                    }
                )
                doe_models = []
            doe_models_cache[normalized_make] = {
                normalized_key(collapse_spaces(item)) for item in doe_models if collapse_spaces(item)
            }

        doe_model_norms = doe_models_cache.get(normalized_make, set())

        if not carquery_models and not vpic_models:
            anomalies.append({"type": "no_models_for_make", "year": str(year), "make": canonical_make})
            continue

        make_source = "carquery" if cq_item else "doe"
        make_id: Optional[int] = None
        if not settings.dry_run:
            existing_make_id = get_make_id(engine, normalized_make)
            make_id = upsert_make(
                engine,
                name=canonical_make,
                normalized_name=normalized_make,
                source=make_source,
                source_key=(cq_item.get("make_id") if cq_item else canonical_make),
                country="US",
            )
            if existing_make_id is None:
                stats.makes_upserted += 1

        model_entries: List[tuple[str, Dict[str, Any], str, str]] = []
        seen_models: Set[str] = set()
        if carquery_models:
            for model_item in carquery_models:
                model_name = collapse_spaces(
                    model_item.get("model_name")
                    or model_item.get("model_display")
                    or model_item.get("model_trim")
                )
                if not model_name:
                    continue
                normalized_model = normalized_key(model_name)
                if normalized_model in seen_models:
                    continue
                seen_models.add(normalized_model)
                model_entries.append((model_name, model_item, normalized_model, "carquery"))
        else:
            for model_item in vpic_models:
                model_name = collapse_spaces(model_item.get("Model_Name"))
                if not model_name:
                    continue
                normalized_model = normalized_key(model_name)
                if normalized_model in seen_models:
                    continue
                seen_models.add(normalized_model)
                model_entries.append((model_name, model_item, normalized_model, "vpic"))

        if not model_entries:
            anomalies.append({"type": "no_models_for_make", "year": str(year), "make": canonical_make})
            continue

        for model_name, model_payload, normalized_model, source in model_entries:
            model_id: Optional[int] = None
            if not settings.dry_run and make_id is not None:
                existing_model_id = get_model_id(engine, make_id, normalized_model)
                model_id = upsert_model(
                    engine,
                    make_id=make_id,
                    name=model_name,
                    normalized_name=normalized_model,
                    source=source,
                    source_key=(
                        model_payload.get("model_id")
                        if source == "carquery"
                        else model_payload.get("Model_ID")
                    ),
                    first_year=year,
                    last_year=year,
                )
                if existing_model_id is None:
                    stats.models_upserted += 1

            if vpic_norms and normalized_model not in vpic_norms:
                anomalies.append(
                    {
                        "type": "model_missing_vpic",
                        "year": str(year),
                        "make": canonical_make,
                        "model": model_name,
                    }
                )
            if doe_model_norms and normalized_model not in doe_model_norms:
                anomalies.append(
                    {
                        "type": "model_missing_doe",
                        "year": str(year),
                        "make": canonical_make,
                        "model": model_name,
                    }
                )

            make_for_trims = make_candidates
            if carquery_make_used:
                make_for_trims = [carquery_make_used] + make_for_trims

            model_variants = _model_aliases(model_name)
            try:
                trims_data = await _fetch_carquery_trims(client, make_for_trims, model_variants, year)
            except CarQueryError as exc:
                console.log(f"[yellow]CarQuery trims denied for {canonical_make} {model_name} {year}: {exc}")
                trims_data = []

            if not trims_data:
                anomalies.append(
                    {
                        "type": "no_trims",
                        "year": str(year),
                        "make": canonical_make,
                        "model": model_name,
                    }
                )
                continue

            active_trims: List[str] = []
            seen_trims: Set[str] = set()
            for trim_entry in trims_data:
                mapped = carquery.map_trim(trim_entry)
                normalized_trim = mapped["normalized_trim_name"]
                if not normalized_trim or normalized_trim in seen_trims:
                    continue
                seen_trims.add(normalized_trim)
                active_trims.append(normalized_trim)
                if settings.dry_run or model_id is None:
                    continue
                trim_id = upsert_trim(
                    engine,
                    model_id=model_id,
                    year=year,
                    trim_name=mapped["trim_name"],
                    normalized_trim_name=normalized_trim,
                    attributes=mapped["attributes"],
                    source="carquery",
                    source_key=f"{trim_entry.model_year}:{trim_entry.model_trim or trim_entry.model_name}",
                )
                stats.trims_upserted += 1
                insert_trim_evidence(
                    engine,
                    trim_id=trim_id,
                    source="carquery",
                    payload=trim_entry.model_dump(),
                )

            if active_trims and not settings.dry_run and model_id is not None:
                mark_trims_inactive(engine, model_id=model_id, year=year, active_normalized_trims=active_trims)

    return anomalies
