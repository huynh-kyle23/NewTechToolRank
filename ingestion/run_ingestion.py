"""Local script: run from repo root with PYTHONPATH=."""

from ingestion.hackernews import fetch_hackernews_tools
from ingestion.utils import load_to_supabase, normalize_records, setup_logging


def main() -> None:
    setup_logging()
    records = normalize_records(fetch_hackernews_tools(5))
    load_to_supabase(records)
    print("loaded", len(records))


if __name__ == "__main__":
    main()
