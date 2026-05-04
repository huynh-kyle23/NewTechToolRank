"""Airflow DAG for New Tools Radar daily pipeline."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator


# Ensure ingestion package is importable inside Airflow containers.
PROJECT_ROOT = Path("/opt/project")
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from ingestion.github import fetch_github_tools
from ingestion.hackernews import fetch_hackernews_tools
from ingestion.product_hunt import fetch_product_hunt_tools
from ingestion.utils import (
    load_to_supabase,
    normalize_records as normalize_records_batch,
    purge_stale_raw_tools as purge_stale_raw_tools_fn,
    setup_logging,
)


def _fetch_all_sources(**context: Dict) -> None:
    setup_logging()
    product_hunt_records = fetch_product_hunt_tools(limit=20)
    hackernews_records = fetch_hackernews_tools(limit=30)
    github_records = fetch_github_tools(limit=30)

    payload = {
        "product_hunt": product_hunt_records,
        "hackernews": hackernews_records,
        "github": github_records,
    }
    context["ti"].xcom_push(key="raw_source_payload", value=json.dumps(payload))


def _normalize(**context: Dict) -> None:
    setup_logging()
    payload = json.loads(context["ti"].xcom_pull(task_ids="fetch_sources", key="raw_source_payload"))
    combined: List[Dict] = payload.get("product_hunt", []) + payload.get("hackernews", []) + payload.get("github", [])
    normalized = normalize_records_batch(combined)
    context["ti"].xcom_push(key="normalized_records", value=json.dumps(normalized))


def _load_to_supabase(**context: Dict) -> None:
    setup_logging()
    records = json.loads(context["ti"].xcom_pull(task_ids="normalize_records", key="normalized_records"))
    load_to_supabase(records)


def _purge_stale_raw_tools(**_: Dict) -> None:
    """Remove raw rows past retention so the warehouse does not grow forever."""
    setup_logging()
    purge_stale_raw_tools_fn()


default_args = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="new_tools_radar",
    description="Daily ingestion and transformation pipeline for new tools radar",
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["new-tools-radar", "data-engineering"],
) as dag:
    fetch_sources = PythonOperator(
        task_id="fetch_sources",
        python_callable=_fetch_all_sources,
    )

    normalize_records_task = PythonOperator(
        task_id="normalize_records",
        python_callable=_normalize,
    )

    load_raw_tools = PythonOperator(
        task_id="load_raw_tools",
        python_callable=_load_to_supabase,
    )

    purge_old_raw = PythonOperator(
        task_id="purge_old_raw_tools",
        python_callable=_purge_stale_raw_tools,
    )

    # BashOperator defaults to append_env=False: a custom `env` would *replace* the process
    # environment, dropping PATH and all SUPABASE_DB_* from Docker `env_file`. dbt would fail.
    dbt_run = BashOperator(
        task_id="run_dbt",
        cwd="/opt/project/dbt",
        append_env=True,
        env={
            "DBT_PROFILES_DIR": "/opt/project/dbt",
        },
        bash_command=(
            "set -euo pipefail && "
            "dbt deps && "
            "dbt run --profiles-dir /opt/project/dbt --target dev && "
            "dbt test --profiles-dir /opt/project/dbt --target dev"
        ),
    )

    fetch_sources >> normalize_records_task >> load_raw_tools >> purge_old_raw >> dbt_run
