select t1.nspname as schemaname,
       t2.relname as tablename,
       t1.nspname||'.'||t2.relname as fullname,
       t5.attname as pk,
       t4.typname as pk_type
  from pg_catalog.pg_namespace   t1,
       pg_catalog.pg_class       t2,
       pg_catalog.pg_constraint  t3,
       pg_catalog.pg_type        t4,
       pg_catalog.pg_attribute   t5
 where t2.relnamespace = t1.oid
   and t3.conrelid     = t2.oid
   and t3.contype      = 'p'
   and t4.oid = t5.atttypid
   and t5.attrelid     = t2.oid
   and t5.attnum       = any(t3.conkey)
   and not t5.attisdropped
   and t5.attnum       > 0
 order by 3