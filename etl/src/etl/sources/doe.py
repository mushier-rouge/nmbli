from __future__ import annotations

from typing import List

import json
import xmltodict

from ..http import HTTPClient

DOE_BASE = "https://www.fueleconomy.gov/ws/rest/vehicle/menu"


def _ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _parse(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # remove any leading junk before '<'
        idx = text.find("<")
        if idx > 0:
            text = text[idx:]
        return xmltodict.parse(text)


async def get_makes(client: HTTPClient, year: int) -> List[str]:
    url = f"{DOE_BASE}/make"
    text = await client.get_text(url, params={"year": year})
    data = _parse(text)
    items = data.get("menuItems") or data
    if isinstance(items, dict) and "menuItem" in items:
        items = items.get("menuItem")
    return [item["text"].strip() for item in _ensure_list(items)]


async def get_models(client: HTTPClient, year: int, make: str) -> List[str]:
    url = f"{DOE_BASE}/model"
    text = await client.get_text(url, params={"year": year, "make": make})
    data = _parse(text)
    items = data.get("menuItems") or data
    if isinstance(items, dict) and "menuItem" in items:
        items = items.get("menuItem")
    return [item["text"].strip() for item in _ensure_list(items)]
