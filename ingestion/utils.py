"""Shared utilities for ingestion jobs and Airflow tasks."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List

import psycopg2
import requests
from psycopg2.extras import execute_batch
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


LOGGER = logging.getLogger(__name__)


def _load_local_dotenv() -> None:
    """Load repo-root `.env` when running outside Docker so os.getenv sees values."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.is_file():
        load_dotenv(env_path, override=False)


_load_local_dotenv()


def setup_logging() -> None:
    """Initialize application logging once for local runs and Airflow."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def get_retry_session(
    retries: int = 3,
    backoff_factor: float = 1.0,
    status_forcelist: Iterable[int] = (429, 500, 502, 503, 504),
) -> requests.Session:
    """Create a requests session with retry behavior for transient errors."""
    retry = Retry(
        total=retries,
        connect=retries,
        read=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods=frozenset({"GET", "POST"}),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def ensure_standard_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Guarantee each record follows the unified raw_tools contract."""
    return {
        "id": str(record.get("id", "")),
        "name": (record.get("name") or "").strip(),
        "source": (record.get("source") or "").strip().lower(),
        "description": (record.get("description") or "").strip(),
        "url": (record.get("url") or "").strip(),
        "score": int(record.get("score") or 0),
        "created_at": record.get("created_at"),
    }


def normalize_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize records and drop obviously invalid entries."""
    normalized: List[Dict[str, Any]] = []
    for record in records:
        clean = ensure_standard_record(record)
        if clean["id"] and clean["name"] and clean["source"]:
            normalized.append(clean)
    LOGGER.info("Normalized %s records", len(normalized))
    return normalized


def load_to_supabase(records: List[Dict[str, Any]]) -> int:
    """
    Bulk load normalized records into Supabase Postgres raw_tools table.

    Uses ``ON CONFLICT (id, source) DO NOTHING``: rows that already exist for the same
    primary key are skipped so a daily pull does not overwrite or duplicate existing rows.

    Requires SUPABASE_DB_URL in environment.
    """
    if not records:
        LOGGER.info("No records provided; skipping database load.")
        return 0

    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        raise ValueError("SUPABASE_DB_URL is required but not set.")

    query = """
        INSERT INTO raw_tools (id, name, source, description, url, score, created_at, ingested_at)
        VALUES (%(id)s, %(name)s, %(source)s, %(description)s, %(url)s, %(score)s, %(created_at)s, NOW())
        ON CONFLICT (id, source) DO NOTHING;
    """

    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            execute_batch(cur, query, records, page_size=100)
        conn.commit()

    LOGGER.info(
        "Finished insert batch for %s raw_tools rows (existing id+source pairs skipped via DO NOTHING)",
        len(records),
    )
    return len(records)


def purge_stale_raw_tools(retention_days: int | None = None) -> int:
    """
    Delete ``raw_tools`` rows whose ``ingested_at`` is older than ``retention_days``.

    Default retention is 30 days, overridable with env ``RAW_TOOLS_RETENTION_DAYS``.
    """
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        raise ValueError("SUPABASE_DB_URL is required but not set.")

    days = retention_days
    if days is None:
        raw = os.getenv("RAW_TOOLS_RETENTION_DAYS", "30")
        try:
            days = int(raw)
        except ValueError as exc:
            raise ValueError(f"RAW_TOOLS_RETENTION_DAYS must be an integer, got {raw!r}") from exc
    if days < 1:
        raise ValueError("retention_days must be >= 1")

    delete_sql = """
        DELETE FROM raw_tools
        WHERE ingested_at < NOW() - (%s * INTERVAL '1 day');
    """

    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(delete_sql, (days,))
            deleted = cur.rowcount
        conn.commit()

    LOGGER.info("Purged %s raw_tools rows older than %s day(s) by ingested_at", deleted, days)
    return int(deleted or 0)
