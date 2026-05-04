
    
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    

with all_values as (

    select
        momentum_label as value_field,
        count(*) as n_records

    from "postgres"."public"."int_tools_clean"
    group by momentum_label

)

select *
from all_values
where value_field not in (
    'hot','rising','new'
)



  
  
      
    ) dbt_internal_test