"""Ingestion package for New Tools Radar."""

from hackernews import fetch_hackernews_tools
from github import fetch_github_tools
from product_hunt import fetch_product_hunt_tools
from utils import load_to_supabase, normalize_records as normalize_records_batch, setup_logging



setup_logging()

r = normalize_records_batch(fetch_hackernews_tools(5))

load_to_supabase(r)
print('loaded', len(r))

