select p.relname as code
  from pg_catalog.pg_class p
       join pg_catalog.pg_namespace pn on pn.oid = p.relnamespace
 where pn.nspname = :schema
   and p.relkind  = 'r'
 order by 1 asc