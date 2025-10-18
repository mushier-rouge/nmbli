from __future__ import annotations

import datetime as dt
from contextlib import contextmanager
from typing import Any, Dict, Iterable, Optional

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, MetaData, String, Table, create_engine, select, text, func, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.engine import Engine

metadata = MetaData()

makes = Table(
    "makes",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False, unique=True),
    Column("normalized_name", String, nullable=False, unique=True),
    Column("country", String),
    Column("source", String, nullable=False),
    Column("source_key", String),
    Column("last_verified_at", DateTime(timezone=True)),
)

models = Table(
    "models",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("make_id", Integer, ForeignKey("makes.id"), nullable=False),
    Column("name", String, nullable=False),
    Column("normalized_name", String, nullable=False),
    Column("first_year", Integer),
    Column("last_year", Integer),
    Column("source", String, nullable=False),
    Column("source_key", String),
    Column("last_verified_at", DateTime(timezone=True)),
)

trims = Table(
    "trims",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("model_id", Integer, ForeignKey("models.id"), nullable=False),
    Column("year", Integer, nullable=False),
    Column("trim_name", String, nullable=False),
    Column("normalized_trim_name", String, nullable=False),
    Column("body", String),
    Column("doors", Integer),
    Column("drive", String),
    Column("transmission", String),
    Column("fuel_type", String),
    Column("market", String, nullable=False, default="US"),
    Column("source", String, nullable=False),
    Column("source_key", String),
    Column("is_active", Boolean, default=True),
    Column("last_verified_at", DateTime(timezone=True)),
)

trim_evidence = Table(
    "trim_evidence",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("trim_id", Integer, ForeignKey("trims.id")),
    Column("source", String, nullable=False),
    Column("payload", JSON, nullable=False),
    Column("observed_at", DateTime(timezone=True), server_default=func.now()),
)


def get_engine(database_url: str) -> Engine:
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return create_engine(database_url, future=True)


@contextmanager
def begin(engine: Engine):
    with engine.begin() as conn:
        yield conn


def upsert_make(engine: Engine, *, name: str, normalized_name: str, source: str, source_key: Optional[str], country: Optional[str] = None) -> int:
    stmt = insert(makes).values(
        name=name,
        normalized_name=normalized_name,
        source=source,
        source_key=source_key,
        country=country,
        last_verified_at=dt.datetime.utcnow(),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[makes.c.normalized_name],
        set_={
            "name": stmt.excluded.name,
            "source": stmt.excluded.source,
            "source_key": stmt.excluded.source_key,
            "country": stmt.excluded.country,
            "last_verified_at": stmt.excluded.last_verified_at,
        },
    ).returning(makes.c.id)
    with begin(engine) as conn:
        result = conn.execute(stmt)
        return result.scalar_one()


def upsert_model(
    engine: Engine,
    *,
    make_id: int,
    name: str,
    normalized_name: str,
    source: str,
    source_key: Optional[str],
    first_year: Optional[int],
    last_year: Optional[int],
) -> int:
    stmt = insert(models).values(
        make_id=make_id,
        name=name,
        normalized_name=normalized_name,
        first_year=first_year,
        last_year=last_year,
        source=source,
        source_key=source_key,
        last_verified_at=dt.datetime.utcnow(),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[models.c.make_id, models.c.normalized_name],
        set_={
            "name": stmt.excluded.name,
            "first_year": func.coalesce(
                func.least(models.c.first_year, stmt.excluded.first_year),
                stmt.excluded.first_year,
                models.c.first_year,
            ),
            "last_year": func.coalesce(
                func.greatest(models.c.last_year, stmt.excluded.last_year),
                stmt.excluded.last_year,
                models.c.last_year,
            ),
            "source": stmt.excluded.source,
            "source_key": stmt.excluded.source_key,
            "last_verified_at": stmt.excluded.last_verified_at,
        },
    ).returning(models.c.id)
    with begin(engine) as conn:
        result = conn.execute(stmt)
        return result.scalar_one()


def upsert_trim(
    engine: Engine,
    *,
    model_id: int,
    year: int,
    trim_name: str,
    normalized_trim_name: str,
    attributes: Dict[str, Any],
    source: str,
    source_key: Optional[str],
    market: str = "US",
) -> int:
    payload = {
        "model_id": model_id,
        "year": year,
        "trim_name": trim_name,
        "normalized_trim_name": normalized_trim_name,
        "body": attributes.get("body"),
        "doors": attributes.get("doors"),
        "drive": attributes.get("drive"),
        "transmission": attributes.get("transmission"),
        "fuel_type": attributes.get("fuel_type"),
        "market": market,
        "source": source,
        "source_key": source_key,
        "is_active": True,
        "last_verified_at": dt.datetime.utcnow(),
    }
    stmt = insert(trims).values(**payload)
    stmt = stmt.on_conflict_do_update(
        index_elements=[trims.c.model_id, trims.c.year, trims.c.normalized_trim_name],
        set_={
            "trim_name": stmt.excluded.trim_name,
            "body": stmt.excluded.body,
            "doors": stmt.excluded.doors,
            "drive": stmt.excluded.drive,
            "transmission": stmt.excluded.transmission,
            "fuel_type": stmt.excluded.fuel_type,
            "market": stmt.excluded.market,
            "source": stmt.excluded.source,
            "source_key": stmt.excluded.source_key,
            "is_active": True,
            "last_verified_at": stmt.excluded.last_verified_at,
        },
    ).returning(trims.c.id)
    with begin(engine) as conn:
        result = conn.execute(stmt)
        return result.scalar_one()


def insert_trim_evidence(engine: Engine, *, trim_id: int, source: str, payload: Dict[str, Any]) -> None:
    stmt = insert(trim_evidence).values(trim_id=trim_id, source=source, payload=payload)
    with begin(engine) as conn:
        conn.execute(stmt)


def mark_trims_inactive(engine: Engine, *, model_id: int, year: int, active_normalized_trims: Iterable[str]) -> None:
    active_set = set(active_normalized_trims)
    with begin(engine) as conn:
        current = conn.execute(
            select(trims.c.normalized_trim_name).where(trims.c.model_id == model_id, trims.c.year == year)
        ).scalars().all()
        to_inactivate = [name for name in current if name not in active_set]
        if not to_inactivate:
            return
        conn.execute(
            update(trims)
            .where(trims.c.model_id == model_id, trims.c.year == year, trims.c.normalized_trim_name.in_(to_inactivate))
            .values(is_active=False, last_verified_at=dt.datetime.utcnow())
        )


def get_model_id(engine: Engine, make_id: int, normalized_model: str) -> Optional[int]:
    with begin(engine) as conn:
        row = conn.execute(
            select(models.c.id).where(models.c.make_id == make_id, models.c.normalized_name == normalized_model)
        ).fetchone()
        return row[0] if row else None


def get_make_id(engine: Engine, normalized_make: str) -> Optional[int]:
    with begin(engine) as conn:
        row = conn.execute(select(makes.c.id).where(makes.c.normalized_name == normalized_make)).fetchone()
        return row[0] if row else None
