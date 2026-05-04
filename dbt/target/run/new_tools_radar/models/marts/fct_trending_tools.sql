
  
    

  create  table "postgres"."public"."fct_trending_tools__dbt_tmp"
  
  
    as
  
  (
    with base as (
    select *
    from "postgres"."public"."int_tools_clean"
),
aggregated as (
    select
        source,
        date_trunc('day', created_at) as created_day,
        count(*) as tools_count,
        avg(score)::numeric(10, 2) as avg_score,
        max(score) as max_score
    from base
    group by 1, 2
)

select
    source,
    created_day,
    tools_count,
    avg_score,
    max_score,
    rank() over (partition by created_day order by avg_score desc) as source_rank_for_day
from aggregated
  );
  