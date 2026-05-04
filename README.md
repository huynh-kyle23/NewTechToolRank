# New Tools Radar

Production-style local data engineering project that ingests emerging tools from Product Hunt, Hacker News, and GitHub, lands raw data in Supabase Postgres, transforms it with dbt, and orchestrates the full pipeline daily with Apache Airflow.

## Project Overview

The pipeline runs once per day and performs:
1. API extraction from Product Hunt, Hacker News, and GitHub.
2. Record normalization into one canonical schema.
3. Insert into `public.raw_tools` on Supabase using **`ON CONFLICT DO NOTHING`**, so rows whose `(id, source)` already exist are **not** re-added or updated on that pull.
4. **Retention purge**: delete `raw_tools` rows whose **`ingested_at`** is older than **30 days** (configurable via `RAW_TOOLS_RETENTION_DAYS`) so the raw layer does not grow without bound.
5. dbt `run` and `test` for staged, cleaned, and mart layers.

Everything is designed for free-tier usage and local-first development.

## Architecture Diagram (ASCII)

```text
                    +--------------------+
                    |  Airflow Scheduler |
                    +---------+----------+
                              |
                              v
                     DAG: new_tools_radar
                              |
     +------------------------+------------------------+
     |                        |                        |
     v                        v                        v
Product Hunt API        Hacker News API          GitHub API
     |                        |                        |
     +----------- fetch + standardize records --------+
                              |
                              v
                      Normalize Unified Schema
         (id, name, source, description, url, score, created_at)
                              |
                              v
                     Supabase Postgres (raw_tools)
                              |
                              v
                         dbt run + test
                              |
                              v
                marts.fct_trending_tools (analytics-ready)
```

## Folder Structure

```text
NewTechToolRank/
├── airflow/
│   ├── dags/
│   │   └── new_tools_radar.py
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
├── ingestion/
│   ├── __init__.py
│   ├── github.py
│   ├── hackernews.py
│   ├── product_hunt.py
│   ├── run_ingestion.py
│   └── utils.py
├── dbt/
│   ├── dbt_project.yml
│   ├── profiles.yml
│   └── models/
│       ├── staging/
│       │   └── stg_tools.sql
│       ├── intermediate/
│       │   └── int_tools_clean.sql
│       ├── marts/
│       │   ├── fct_trending_tools.sql
│       │   └── fct_tool_intel_daily.sql
│       └── schema.yml
├── supabase/
│   └── schema.sql
├── .env
├── .env.example
└── README.md
```

## Setup Instructions

### 1) Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- Supabase project (free tier)
- Python 3.10+ (optional for local script execution)

### 2) Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then update values in `.env`:
- `SUPABASE_DB_URL`
- `PRODUCT_HUNT_TOKEN`
- `GITHUB_TOKEN`
- optional `SUPABASE_DB_*` vars for dbt profile
- optional `RAW_TOOLS_RETENTION_DAYS` (default **30**) — how many days of `raw_tools` history to keep by `ingested_at` before the DAG purge step deletes older rows

### 3) Create Raw Schema in Supabase

Run SQL from `supabase/schema.sql` in Supabase SQL editor.

### 4) Start Airflow (Docker Compose)

```bash
cd airflow
docker compose up airflow-init
docker compose up -d
```

Access Airflow at [http://localhost:8080](http://localhost:8080)
- username: `admin`
- password: `admin`

### 5) Trigger DAG

From Airflow UI:
1. Open DAG `new_tools_radar`
2. Click **Unpause**
3. Click **Trigger DAG**

Or from Airflow CLI container:

```bash
docker compose exec scheduler airflow dags trigger new_tools_radar
```

## Run The Whole Pipeline Again

Use this section whenever you want to re-run everything end-to-end after code or env changes.

### Quick re-run (most common)

```bash
cd airflow
docker compose up -d
docker compose exec scheduler airflow dags trigger new_tools_radar
```

Then in Airflow UI (`http://localhost:8080`):
1. Open DAG `new_tools_radar`.
2. Confirm all tasks go green (`fetch_sources`, `normalize_records`, `load_raw_tools`, `purge_old_raw_tools`, `run_dbt`).
3. If a task is yellow (`up_for_retry`), open task logs and fix the root error.

### Re-run after changing dependencies / Dockerfile / requirements

```bash
cd airflow
docker compose down
docker compose build --no-cache
docker compose up airflow-init
docker compose up -d
docker compose exec scheduler airflow dags trigger new_tools_radar
```

### Full local reset (only if you want a clean Airflow metadata DB)

```bash
cd airflow
docker compose down -v
docker compose build --no-cache
docker compose up airflow-init
docker compose up -d
docker compose exec scheduler airflow dags trigger new_tools_radar
```

`down -v` deletes Docker volumes for local Airflow metadata. It does **not** delete your Supabase tables.

## dbt Models

- `stg_tools`: clean typecasts + source normalization (includes `ingested_at` from ingestion, i.e. when the row landed in `raw_tools`).
- `int_tools_clean`: dedupe by `(source, tool_id)` and add:
  - **Pull time**: `data_pulled_at` (timestamp) and `data_pulled_date` (date) copied from `ingested_at`, so every mart row knows which ingest batch it came from.
  - **Data vs non-data**: `tool_domain` is `data_tool` vs `non_data_tool` using keyword signals in the combined name + description text (case-insensitive `LIKE` patterns).
  - **Practice area** (data tools only): `data_practice_category` buckets into `ai`, `machine_learning`, `dbms`, `data_visualization`, `data_modeling`, or `other_data` when the text looks broadly “data/analytics/ETL” but does not match a specific bucket. For `non_data_tool`, `data_practice_category` is **null**.
  - **Momentum**: `momentum_label` (`hot` / `rising` / `new`) from score thresholds.
- `fct_trending_tools`: daily source-level aggregates and ranking (unchanged grain).
- `fct_tool_intel_daily`: daily aggregates by **`data_pulled_date`**, **`tool_domain`**, and **`data_practice_category`** so you can see mix of data vs non-data tools per pull day.

These classifications are **heuristic**, not ground truth. Extend the keyword lists in `int_tools_clean.sql` as you learn false positives/negatives, or later swap in a taxonomy table or ML classifier.

Included dbt tests:
- `not_null` on key columns (including new enrichment fields where always populated).
- `accepted_values` on `source`, `tool_domain`, and `momentum_label` (generic tests use the `arguments` block for dbt 1.11+).

## Example Queries

Top sources by average score today:

```sql
select source, avg_score, source_rank_for_day
from public.fct_trending_tools
where created_day = current_date
order by source_rank_for_day asc;
```

Most recent high-momentum tools:

```sql
select tool_name, source, score, momentum_label, created_at
from public.int_tools_clean
where momentum_label in ('hot', 'rising')
order by score desc, created_at desc
limit 25;
```

Mix of data vs non-data tools for the latest pull day:

```sql
select
  tool_domain,
  data_practice_category,
  tools_count,
  avg_score
from public.fct_tool_intel_daily
where pull_date = (select max(data_pulled_date) from public.int_tools_clean)
order by tools_count desc;
```

## Free-Tier Compatibility Notes

- Uses only public/free APIs and open-source tools.
- Supabase free Postgres is sufficient for daily ingestion volumes.
- Airflow runs locally in Docker; no managed scheduler needed.

## Future Improvements

- Add incremental loading with state tracking (`last_seen_id`, timestamps).
- Add Great Expectations or dbt-expectations for richer data quality checks.
- Add Slack/Email alerting on DAG failure and data drift.
- Add CI pipeline for linting, unit tests, and dbt checks.
- Partition and archive raw data for long-term retention.
