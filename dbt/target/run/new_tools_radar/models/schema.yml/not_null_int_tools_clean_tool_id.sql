
    
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select tool_id
from "postgres"."public"."int_tools_clean"
where tool_id is null



  
  
      
    ) dbt_internal_test