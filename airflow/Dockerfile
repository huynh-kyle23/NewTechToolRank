# Airflow base image + Postgres client headers so pip can build psycopg2 (dbt-postgres dependency).
FROM apache/airflow:2.9.1

USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential libpq-dev \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

USER airflow
