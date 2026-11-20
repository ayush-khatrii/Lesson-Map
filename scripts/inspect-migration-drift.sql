-- Read-only diagnostics. Run in the same Neon branch/database as migrate deploy.
-- These queries return schema/history metadata, not customer records or secrets.
SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
FROM public."_prisma_migrations"
ORDER BY started_at;

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name IN ('PlaylistImport', 'CourseEvent', 'Lead', 'LessonProgress', 'UploadAllocation')
    OR (table_name = 'user' AND column_name IN ('subdomain', 'youtubeImports', 'paymentEnvironment'))
    OR (table_name = 'Course' AND column_name = 'emailCapture')
  )
ORDER BY table_name, ordinal_position;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user', 'PlaylistImport', 'CourseEvent', 'Lead', 'LessonProgress', 'UploadAllocation')
ORDER BY tablename, indexname;

SELECT c.relname AS table_name, con.conname,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('PlaylistImport', 'CourseEvent', 'Lead', 'LessonProgress', 'UploadAllocation')
ORDER BY c.relname, con.conname;
