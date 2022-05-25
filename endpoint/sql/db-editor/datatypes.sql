select t.typname as code
  from pg_catalog.pg_type t
 where t.typtype = 'b'
   and t.typcategory not in ('A','G')
 order by t.typname