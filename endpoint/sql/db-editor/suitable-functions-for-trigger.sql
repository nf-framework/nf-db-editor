select p.proname as code
  from pg_catalog.pg_proc p
       join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
       join pg_catalog.pg_type pt on (pt.oid = p.prorettype and pt.typname = 'trigger')
 where pn.nspname = :schema
{{#if (eq by_table true)}} and p.proname ~ :tablename{{/if}}
 order by 1 asc