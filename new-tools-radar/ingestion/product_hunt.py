"""Product Hunt API ingestion."""

from __future__ import annotations

import os
from typing import Any, Dict, List

from ingestion.utils import LOGGER, get_retry_session


PRODUCT_HUNT_API_URL = "https://api.producthunt.com/v2/api/graphql"


def fetch_product_hunt_tools(limit: int = 20) -> List[Dict[str, Any]]:
    """Fetch recent Product Hunt posts and map to the unified schema."""
    token = os.getenv("PRODUCT_HUNT_TOKEN")
    if not token:
        raise ValueError("PRODUCT_HUNT_TOKEN is required but not set.")

    session = get_retry_session()
    query = """
    query NewTools($first: Int!) {
      posts(first: $first) {
        edges {
          node {
            id
            name
            tagline
            url
            votesCount
            createdAt
          }
        }
      }
    }
    """
    payload = {"query": query, "variables": {"first": limit}}
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    response = session.post(PRODUCT_HUNT_API_URL, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    data = response.json()

    if "errors" in data:
        raise RuntimeError(f"Product Hunt API returned errors: {data['errors']}")

    edges = data.get("data", {}).get("posts", {}).get("edges", [])
    records: List[Dict[str, Any]] = []
    for edge in edges:
        node = edge.get("node", {})
        if not node:
            continue
        records.append(
            {
                "id": str(node.get("id", "")),
                "name": node.get("name"),
                "source": "product_hunt",
                "description": node.get("tagline"),
                "url": node.get("url"),
                "score": node.get("votesCount", 0),
                "created_at": node.get("createdAt"),
            }
        )

    LOGGER.info("Fetched %s Product Hunt records", len(records))
    return records


if __name__ == "__main__":
    from ingestion.utils import setup_logging

    setup_logging()
    print(fetch_product_hunt_tools())
