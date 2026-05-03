"""Hacker News API ingestion."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from ingestion.utils import LOGGER, get_retry_session


HN_BASE_URL = "https://hacker-news.firebaseio.com/v0"


def _to_iso8601(unix_ts: int) -> str:
    return datetime.fromtimestamp(unix_ts, tz=timezone.utc).isoformat()


def fetch_hackernews_tools(limit: int = 30) -> List[Dict[str, Any]]:
    """Fetch top Hacker News stories and map to unified schema."""
    session = get_retry_session()

    top_ids_res = session.get(f"{HN_BASE_URL}/topstories.json", timeout=30)
    top_ids_res.raise_for_status()
    top_ids = top_ids_res.json()[:limit]

    records: List[Dict[str, Any]] = []
    for story_id in top_ids:
        item_res = session.get(f"{HN_BASE_URL}/item/{story_id}.json", timeout=30)
        item_res.raise_for_status()
        item = item_res.json() or {}

        if item.get("type") != "story" or "title" not in item:
            continue

        records.append(
            {
                "id": str(item.get("id", "")),
                "name": item.get("title"),
                "source": "hackernews",
                "description": item.get("text", ""),
                "url": item.get("url", f"https://news.ycombinator.com/item?id={item.get('id')}"),
                "score": item.get("score", 0),
                "created_at": _to_iso8601(item.get("time", 0)),
            }
        )

    LOGGER.info("Fetched %s Hacker News records", len(records))
    return records


if __name__ == "__main__":
    from ingestion.utils import setup_logging

    setup_logging()
    print(fetch_hackernews_tools())
