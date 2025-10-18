from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from pydantic import BaseModel

from ..http import HTTPClient
from ..normalize import normalize_make_name, normalized_key, clean_trim_name, derive_standard_transmission, normalize_drivetrain, collapse_spaces

CARQUERY_BASE = "https://www.carqueryapi.com/api/0.3/"
JSONP_RE = re.compile(r"^[^(]+\((.*)\);?$")


class CarQueryTrim(BaseModel):
    model_make_id: str
    model_name: str
    model_trim: str | None = None
    model_year: int
    model_body: str | None = None
    model_doors: str | None = None
    model_drive: str | None = None
    model_transmission_type: str | None = None
    model_engine_fuel: str | None = None

    model_config = {
        "protected_namespaces": (),
    }


async def _call(client: HTTPClient, params: Dict[str, Any]) -> Dict[str, Any]:
    # CarQuery expects query in `cmd`
    response = await client.get_text(CARQUERY_BASE, params=params)
    match = JSONP_RE.match(response.strip())
    if match:
        response = match.group(1)
    data = json.loads(response)
    if isinstance(data, dict) and data.get("error"):
        raise CarQueryError(data["error"])
    return data


async def get_makes(client: HTTPClient, year: int) -> List[Dict[str, Any]]:
    data = await _call(client, {"cmd": "getMakes", "year": year, "sold_in_us": 1})
    return data.get("Makes", [])


async def get_all_makes(client: HTTPClient) -> List[Dict[str, Any]]:
    data = await _call(client, {"cmd": "getMakes"})
    return data.get("Makes", [])


async def get_models(client: HTTPClient, make: str, year: int, *, sold_in_us: bool = True) -> List[Dict[str, Any]]:
    params: Dict[str, Any] = {"cmd": "getModels", "make": make, "year": year}
    if sold_in_us:
        params["sold_in_us"] = 1
    data = await _call(client, params)
    return data.get("Models", [])


async def get_trims(client: HTTPClient, make: str, model: str, year: int, *, sold_in_us: bool = True) -> List[CarQueryTrim]:
    params: Dict[str, Any] = {
        "cmd": "getTrims",
        "make": make,
        "model": model,
        "year": year,
    }
    if sold_in_us:
        params["sold_in_us"] = 1
    data = await _call(client, params)
    return [CarQueryTrim(**item) for item in data.get("Trims", [])]


def map_trim(trim: CarQueryTrim) -> Dict[str, Any]:
    trim_name_raw = trim.model_trim or trim.model_name
    cleaned_name = clean_trim_name(trim_name_raw)
    normalized_trim = normalized_key(cleaned_name)
    return {
        "trim_name": cleaned_name,
        "normalized_trim_name": normalized_trim,
        "attributes": {
            "body": collapse_spaces(trim.model_body),
            "doors": int(trim.model_doors) if trim.model_doors and trim.model_doors.isdigit() else None,
            "drive": normalize_drivetrain(trim.model_drive),
            "transmission": derive_standard_transmission(trim.model_transmission_type),
            "fuel_type": collapse_spaces(trim.model_engine_fuel),
        },
    }
class CarQueryError(RuntimeError):
    """Raised when the CarQuery API returns an error payload."""
