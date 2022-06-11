select exists (select null
                 from information_schema.routines r
                where r.routine_schema = :schema
                  and r.routine_name = :name) as exist
