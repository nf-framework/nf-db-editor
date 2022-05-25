select schema_name as code
  from information_schema.schemata
 where schema_name != 'pg_catalog'
 order by 1