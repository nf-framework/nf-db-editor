select p.proname as obj_name,
       pn.nspname as obj_schema,
       pn.nspname||'.'||p.proname as obj_fullname,
       pn.nspname||'.'||p.proname||'('||pg_catalog.pg_get_function_identity_arguments(p.oid)||')' as obj_identity,
       'function' as obj_type
  from pg_catalog.pg_proc p
       join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
 where pn.nspname = :schema
   and :type in ('function','all')
union all
select p.relname as obj_name,
       pn.nspname as obj_schema,
       pn.nspname||'.'||p.relname as obj_fullname,
       pn.nspname||'.'||p.relname as obj_identity,
       'table' as obj_type
  from pg_catalog.pg_class p
       join pg_catalog.pg_namespace pn on pn.oid = p.relnamespace
 where pn.nspname = :schema
   and p.relkind  = 'r'
   and :type in ('table','all')
union all
select p.relname as obj_name,
       pn.nspname as obj_schema,
       pn.nspname||'.'||p.relname as obj_fullname,
       pn.nspname||'.'||p.relname as obj_identity,
       'view' as obj_type
  from pg_catalog.pg_class p
       join pg_catalog.pg_namespace pn on pn.oid = p.relnamespace
 where pn.nspname = :schema
   and p.relkind  = 'v'
   and :type in ('view','all')
union all
select tr.tgname as obj_name,
       pn.nspname as obj_schema,
       pn.nspname||'.'||p.relname||'.'||tr.tgname as obj_fullname,
       pn.nspname||'.'||p.relname||'.'||tr.tgname as obj_identity,
       'trigger' as obj_type
  from pg_catalog.pg_class p
       join pg_catalog.pg_namespace pn on pn.oid = p.relnamespace
       join  pg_catalog.pg_trigger tr on tr.tgrelid = p.oid
 where pn.nspname = :schema
   and not tr.tgisinternal
   and :type in ('trigger','all')
union all
select p.relname as obj_name,
       pn.nspname as obj_schema,
       pn.nspname||'.'||p.relname as obj_fullname,
       pn.nspname||'.'||p.relname as obj_identity,
       'sequence' as obj_type
  from pg_catalog.pg_class p
       join pg_catalog.pg_namespace pn on pn.oid = p.relnamespace
 where pn.nspname = :schema
   and p.relkind  = 'S'
   and :type in ('sequence','all')
 order by 1 asc