from __future__ import annotations

from typing import Any, Dict, List

from ..http import HTTPClient

VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles"


async def get_all_makes(client: HTTPClient) -> List[Dict[str, Any]]:
    url = f"{VPIC_BASE}/getallmakes"
    data = await client.get_json(url, params={"format": "json"})
    return data.get("Results", [])


async def get_models_for_make_year(client: HTTPClient, make: str, year: int) -> List[Dict[str, Any]]:
    url = f"{VPIC_BASE}/GetModelsForMakeYear/make/{make}/modelyear/{year}"
    data = await client.get_json(url, params={"format": "json"})
    return data.get("Results", [])
