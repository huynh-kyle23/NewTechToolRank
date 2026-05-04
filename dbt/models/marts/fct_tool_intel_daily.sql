-- Daily snapshot of how pulls break down by data vs non-data and practice area.
with base as (
    select *
    from {{ ref('int_tools_clean') }}
)

select
    data_pulled_date as pull_date,
    tool_domain,
    data_practice_category,
    count(*) as tools_count,
    avg(score)::numeric(10, 2) as avg_score,
    max(score) as max_score
from base
group by 1, 2, 3
