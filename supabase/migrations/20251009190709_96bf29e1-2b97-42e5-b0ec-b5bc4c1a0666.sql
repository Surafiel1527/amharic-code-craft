-- Move pg_net extension to extensions schema (security best practice)
DROP EXTENSION IF EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_net" SCHEMA extensions;