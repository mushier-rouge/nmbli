import json

import pytest
import respx
import httpx

from etl.http import HTTPCache, HTTPClient
from etl.sources import carquery, vpic, doe


@pytest.mark.asyncio
async def test_carquery_trim_mapping(tmp_path):
    cache = HTTPCache(tmp_path, enabled=False)
    client = HTTPClient(timeout=5, cache=cache)

    sample = {
        "Trims": [
            {
                "model_make_id": "toyota",
                "model_name": "Camry",
                "model_trim": "LE FWD",
                "model_year": 2024,
                "model_body": "Sedan",
                "model_doors": "4",
                "model_drive": "FWD",
                "model_transmission_type": "AT",
                "model_engine_fuel": "Gasoline",
            }
        ]
    }

    with respx.mock(base_url="https://www.carqueryapi.com") as mock:
        mock.get("/api/0.3/").mock(return_value=httpx.Response(200, text=json.dumps(sample)))
        trims = await carquery.get_trims(client, "toyota", "camry", 2024)
    mapped = carquery.map_trim(trims[0])
    assert mapped["trim_name"] == "LE FWD"
    assert mapped["attributes"]["transmission"] == "Automatic"
    await client.aclose()


@pytest.mark.asyncio
async def test_vpic_models(tmp_path):
    cache = HTTPCache(tmp_path, enabled=False)
    client = HTTPClient(timeout=5, cache=cache)
    sample = {"Results": [{"Model_Name": "Camry"}]}
    with respx.mock(base_url="https://vpic.nhtsa.dot.gov") as mock:
        mock.get("/api/vehicles/GetModelsForMakeYear/make/Toyota/modelyear/2024").respond(200, json=sample)
        models = await vpic.get_models_for_make_year(client, "Toyota", 2024)
    assert models[0]["Model_Name"] == "Camry"
    await client.aclose()


@pytest.mark.asyncio
async def test_doe_models(tmp_path):
    cache = HTTPCache(tmp_path, enabled=False)
    client = HTTPClient(timeout=5, cache=cache)
    xml = """
    <menuItems>
      <menuItem>
        <text>Camry</text>
      </menuItem>
    </menuItems>
    """
    with respx.mock(base_url="https://www.fueleconomy.gov") as mock:
        mock.get("/ws/rest/vehicle/menu/model").respond(200, text=xml)
        models = await doe.get_models(client, 2024, "Toyota")
    assert models == ["Camry"]
    await client.aclose()
