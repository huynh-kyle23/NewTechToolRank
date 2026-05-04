
  create view "postgres"."public"."stg_tools__dbt_tmp"
    
    
  as (
    with source_data as (
    select
        id::text as tool_id,
        trim(name) as tool_name,
        lower(trim(source)) as source,
        nullif(trim(description), '') as description,
        nullif(trim(url), '') as url,
        coalesce(score, 0)::int as score,
        created_at::timestamptz as created_at,
        ingested_at::timestamptz as ingested_at
    from "postgres"."public"."raw_tools"
)

select *
from source_data
where tool_id is not null
  and tool_name is not null
  and source is not null
  );