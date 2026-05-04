
    
    

with all_values as (

    select
        source as value_field,
        count(*) as n_records

    from "postgres"."public"."stg_tools"
    group by source

)

select *
from all_values
where value_field not in (
    'product_hunt','hackernews','github'
)


