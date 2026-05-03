"""GitHub API ingestion."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from ingestion.utils import LOGGER, get_retry_session


GITHUB_SEARCH_URL = "https://api.github.com/search/repositories"


def fetch_github_tools(limit: int = 30) -> List[Dict[str, Any]]:
    """
    Fetch trending repositories created in the last 30 days.

    The endpoint works without auth but token is recommended for better rate limits.
    """
    token = os.getenv("GITHUB_TOKEN", "")
    created_after = (datetime.now(tz=timezone.utc) - timedelta(days=30)).date().isoformat()

    session = get_retry_session()
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    params = {
        "q": f"created:>={created_after}",
        "sort": "stars",
        "order": "desc",
        "per_page": min(limit, 100),
    }
    response = session.get(GITHUB_SEARCH_URL, headers=headers, params=params, timeout=30)
    response.raise_for_status()
    items = response.json().get("items", [])

    records: List[Dict[str, Any]] = []
    for item in items:
        records.append(
            {
                "id": str(item.get("id", "")),
                "name": item.get("name"),
                "source": "github",
                "description": item.get("description", ""),
                "url": item.get("html_url"),
                "score": item.get("stargazers_count", 0),
                "created_at": item.get("created_at"),
            }
        )

    LOGGER.info("Fetched %s GitHub records", len(records))
    return records


if __name__ == "__main__":
    from ingestion.utils import setup_logging

    setup_logging()
    print(fetch_github_tools())
