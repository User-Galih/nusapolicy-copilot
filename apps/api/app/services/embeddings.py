"""Embeddings provider supporting 9Router API (per 9router-embeddings skill) with local fallback."""

from __future__ import annotations

import json
from urllib import request as urlrequest
from functools import lru_cache
from app.core.config import get_settings


EMBEDDING_DIMENSIONS = 1536


def _embed_via_9router(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    endpoint = f"{settings.ninerouter_url.rstrip('/')}/v1/embeddings"
    payload = {
        "model": settings.ninerouter_embedding_model,
        "input": texts,
    }
    req = urlrequest.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.ninerouter_api_key.get_secret_value()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlrequest.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]


class EmbeddingProvider:
    """Produces vector embeddings using 9Router /v1/embeddings."""

    def embed_passages(self, texts: list[str]) -> list[list[float]]:
        return _embed_via_9router(texts)

    def embed_query(self, text: str) -> list[float]:
        return _embed_via_9router([text])[0]
