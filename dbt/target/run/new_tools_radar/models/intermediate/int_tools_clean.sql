
  
    

  create  table "postgres"."public"."int_tools_clean__dbt_tmp"
  
  
    as
  
  (
    with ranked as (
    select
        tool_id,
        tool_name,
        source,
        description,
        url,
        score,
        created_at,
        ingested_at,
        row_number() over (
            partition by source, tool_id
            order by ingested_at desc
        ) as rn
    from "postgres"."public"."stg_tools"
),
deduped as (
    select
        tool_id,
        tool_name,
        source,
        description,
        url,
        score,
        created_at,
        ingested_at
    from ranked
    where rn = 1
)

select
    tool_id,
    tool_name,
    source,
    description,
    url,
    score,
    created_at,
    ingested_at,
    case
        when score >= 500 then 'hot'
        when score >= 100 then 'rising'
        else 'new'
    end as momentum_label
from deduped
  );
  