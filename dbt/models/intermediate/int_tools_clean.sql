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
    from {{ ref('stg_tools') }}
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
),
blobbed as (
    select
        *,
        lower(coalesce(tool_name, '') || ' ' || coalesce(description, '')) as search_blob
    from deduped
),
categorized as (
    select
        *,
        case
            when
                search_blob like '%openai%'
                or search_blob like '%gpt%'
                or search_blob like '%anthropic%'
                or search_blob like '%claude%'
                or search_blob like '%gemini%'
                or search_blob like '%llm%'
                or search_blob like '%generative ai%'
                or search_blob like '%copilot%'
                or search_blob like '%chatbot%'
                or search_blob like '%rag %'
                or search_blob like '% agent %'
                or search_blob like '% ai %'
                or search_blob like '% ai,%'
                or search_blob like '% ai.%'
                or search_blob like 'ai %'
                or search_blob like '% machine intelligence%'
            then 'ai'
            when
                search_blob like '%pytorch%'
                or search_blob like '%tensorflow%'
                or search_blob like '%keras%'
                or search_blob like '%xgboost%'
                or search_blob like '%sklearn%'
                or search_blob like '%scikit%'
                or search_blob like '%neural%'
                or search_blob like '%fine-tun%'
                or search_blob like '%machine learning%'
                or search_blob like '% deep learning%'
                or search_blob like '% ml %'
                or search_blob like '% ml,%'
                or search_blob like 'ml %'
            then 'machine_learning'
            when
                search_blob like '%postgres%'
                or search_blob like '%postgresql%'
                or search_blob like '%mysql%'
                or search_blob like '%mongodb%'
                or search_blob like '%redis%'
                or search_blob like '%sqlite%'
                or search_blob like '%snowflake%'
                or search_blob like '%bigquery%'
                or search_blob like '%clickhouse%'
                or search_blob like '%databricks%'
                or search_blob like '%warehouse%'
                or search_blob like '%database%'
                or search_blob like '%dbms%'
                or search_blob like '% nosql%'
                or search_blob like '% sql %'
                or search_blob like '%sql,%'
                or search_blob like 'sql %'
                or search_blob like '%prisma%'
                or search_blob like '%supabase%'
            then 'dbms'
            when
                search_blob like '%visualization%'
                or search_blob like '%visualise%'
                or search_blob like '%visualize%'
                or search_blob like '%dashboard%'
                or search_blob like '%chart%'
                or search_blob like '%plot%'
                or search_blob like '%tableau%'
                or search_blob like '%looker%'
                or search_blob like '%metabase%'
                or search_blob like '%grafana%'
                or search_blob like '%power bi%'
                or search_blob like '%d3.js%'
            then 'data_visualization'
            when
                search_blob like '%dbt%'
                or search_blob like '%data modeling%'
                or search_blob like '%data modelling%'
                or search_blob like '%semantic layer%'
                or search_blob like '%metric layer%'
                or search_blob like '%data vault%'
                or search_blob like '%star schema%'
                or search_blob like '%dimensional model%'
            then 'data_modeling'
            else null
        end as _specific_category,
        case
            when
                search_blob like '%analytics%'
                or search_blob like '%dataset%'
                or search_blob like '%data pipeline%'
                or search_blob like '%data platform%'
                or search_blob like '%data stack%'
                or search_blob like '%etl%'
                or search_blob like '%elt%'
                or search_blob like '%data lake%'
                or search_blob like '%data warehouse%'
                or search_blob like '%spark%'
                or search_blob like '%kafka%'
                or search_blob like '%airflow%'
                or search_blob like '%dagster%'
                or search_blob like '%prefect%'
                or search_blob like '% data %'
                or search_blob like '% data,%'
                or search_blob like 'data %'
                or search_blob like '% bi %'
                or search_blob like '%business intelligence%'
            then true
            else false
        end as _generic_data_signal
    from blobbed
),
labeled as (
    select
        *,
        case
            when _specific_category is not null then _specific_category
            when _generic_data_signal then 'other_data'
            else null
        end as data_practice_category,
        case
            when _specific_category is not null then 'data_tool'
            when _generic_data_signal then 'data_tool'
            else 'non_data_tool'
        end as tool_domain
    from categorized
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
    ingested_at as data_pulled_at,
    ingested_at::date as data_pulled_date,
    tool_domain,
    case
        when tool_domain = 'non_data_tool' then null
        else data_practice_category
    end as data_practice_category,
    case
        when score >= 500 then 'hot'
        when score >= 100 then 'rising'
        else 'new'
    end as momentum_label
from labeled
