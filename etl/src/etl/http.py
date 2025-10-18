from __future__ import annotations

import asyncio
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict

import httpx
from tenacity import AsyncRetrying, retry_if_exception_type, stop_after_attempt, wait_exponential_jitter


class HTTPCache:
    def __init__(self, cache_dir: str, enabled: bool = True) -> None:
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.enabled = enabled
        self.lock = asyncio.Lock()

    def _path_for(self, url: str, params: Dict[str, Any] | None) -> Path:
        key_source = url
        if params:
            items = sorted(params.items())
            key_source += json.dumps(items, sort_keys=True)
        digest = hashlib.sha1(key_source.encode()).hexdigest()
        return self.cache_dir / f"{digest}.json"

    async def get(self, url: str, params: Dict[str, Any] | None) -> Dict[str, Any] | None:
        if not self.enabled:
            return None
        path = self._path_for(url, params)
        if not path.exists():
            return None
        async with self.lock:
            try:
                return json.loads(path.read_text())
            except json.JSONDecodeError:
                return None

    async def set(self, url: str, params: Dict[str, Any] | None, payload: Dict[str, Any]) -> None:
        if not self.enabled:
            return
        path = self._path_for(url, params)
        async with self.lock:
            path.write_text(json.dumps(payload))


class HTTPClient:
    def __init__(self, *, timeout: float, cache: HTTPCache, max_connections: int = 8) -> None:
        limits = httpx.Limits(max_connections=max_connections, max_keepalive_connections=max_connections)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.carqueryapi.com/",
        }
        self.client = httpx.AsyncClient(timeout=timeout, limits=limits, headers=headers)
        self.cache = cache

    async def get_json(self, url: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
        cached = await self.cache.get(url, params)
        if cached is not None:
            return cached

        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential_jitter(initial=0.25, max=3.0),
            retry=retry_if_exception_type(httpx.HTTPError),
        ):
            with attempt:
                response = await self.client.get(url, params=params)
                if response.status_code == 404:
                    return {}
                response.raise_for_status()
                data = response.json()
                await self.cache.set(url, params, data)
                return data
        raise RuntimeError("Unreachable")

    async def get_text(self, url: str, params: Dict[str, Any] | None = None) -> str:
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential_jitter(initial=0.25, max=3.0),
            retry=retry_if_exception_type(httpx.HTTPError),
        ):
            with attempt:
                response = await self.client.get(url, params=params)
                if response.status_code == 404:
                    return ""
                response.raise_for_status()
                return response.text
        raise RuntimeError("Unreachable")

    async def aclose(self) -> None:
        await self.client.aclose()


async def create_client(timeout: float, cache_dir: str, use_cache: bool) -> HTTPClient:
    cache = HTTPCache(cache_dir, enabled=use_cache)
    return HTTPClient(timeout=timeout, cache=cache)
