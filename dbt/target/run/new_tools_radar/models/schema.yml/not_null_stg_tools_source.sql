
    
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select source
from "postgres"."public"."stg_tools"
where source is null



  
  
      
    ) dbt_internal_test