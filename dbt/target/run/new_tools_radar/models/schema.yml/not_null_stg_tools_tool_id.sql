
    
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select tool_id
from "postgres"."public"."stg_tools"
where tool_id is null



  
  
      
    ) dbt_internal_test