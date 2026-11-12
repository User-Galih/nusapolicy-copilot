"""Embeddings provider using Google AI Studio Gemini Embedding API."""

from __future__ import annotations

import json
from urllib import request as urlrequest

from app.core.config import get_settings


EMBEDDING_DIMENSIONS = 1536
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def _normalize_model_name(model: str) -> str:
    return model if model.startswith("models/") else f"models/{model}"


def _embed_via_gemini(texts: list[str], is_query: bool = False) -> list[list[float]]:
    if not texts:
        return []

    settings = get_settings()
    model_name = _normalize_model_name(settings.gemini_embedding_model)
    api_key = settings.gemini_api_key.get_secret_value()

    formatted_texts = [
        f"task: question answering | query: {t}"
        if is_query
        else f"title: none | text: {t}"
        for t in texts
    ]

    if len(formatted_texts) == 1:
        endpoint = f"{GEMINI_API_BASE}/{model_name}:embedContent"
        payload = {
            "model": model_name,
            "content": {"parts": [{"text": formatted_texts[0]}]},
            "output_dimensionality": EMBEDDING_DIMENSIONS,
        }
        req = urlrequest.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return [data["embedding"]["values"]]

    # Batch embed (max 100 per call on Gemini API)
    all_embeddings: list[list[float]] = []
    batch_size = 50
    endpoint = f"{GEMINI_API_BASE}/{model_name}:batchEmbedContents"
    for i in range(0, len(formatted_texts), batch_size):
        batch = formatted_texts[i : i + batch_size]
        payload = {
            "requests": [
                {
                    "model": model_name,
                    "content": {"parts": [{"text": item}]},
                    "output_dimensionality": EMBEDDING_DIMENSIONS,
                }
                for item in batch
            ]
        }
        req = urlrequest.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        all_embeddings.extend(item["values"] for item in data["embeddings"])
    return all_embeddings


class EmbeddingProvider:
    """Produces 1536-dim vector embeddings using Google AI Studio Gemini Embedding 2."""

    def embed_passages(self, texts: list[str]) -> list[list[float]]:
        return _embed_via_gemini(texts, is_query=False)

    def embed_query(self, text: str) -> list[float]:
        return _embed_via_gemini([text], is_query=True)[0]
