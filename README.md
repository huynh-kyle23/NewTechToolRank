# New Tools Radar

Production-style local data engineering project that ingests emerging tools from Product Hunt, Hacker News, and GitHub, lands raw data in Supabase Postgres, transforms it with dbt, and orchestrates the full pipeline daily with Apache Airflow.

## Project Overview

The pipeline runs once per day and performs:
1. API extraction from Product Hunt, Hacker News, and GitHub.
2. Record normalization into one canonical schema.
3. Upsert into `public.raw_tools` on Supabase.
4. dbt `run` and `test` for staged, cleaned, and mart layers.

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
new-tools-radar/
├── airflow/
│   ├── dags/
│   │   └── new_tools_radar.py
│   ├── docker-compose.yml
│   └── requirements.txt
├── ingestion/
│   ├── github.py
│   ├── hackernews.py
│   ├── product_hunt.py
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
│       │   └── fct_trending_tools.sql
│       └── schema.yml
├── supabase/
│   └── schema.sql
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

## dbt Models

- `stg_tools`: clean typecasts + source normalization.
- `int_tools_clean`: dedupe by `(source, tool_id)` and add momentum labels.
- `fct_trending_tools`: daily source-level aggregates and ranking.

Included dbt tests:
- `not_null` on key columns.
- `accepted_values` on `source` and `momentum_label`.

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
