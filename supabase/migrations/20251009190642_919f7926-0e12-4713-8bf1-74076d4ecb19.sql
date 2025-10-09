-- Move uuid-ossp extension to extensions schema (security best practice)
DROP EXTENSION IF EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;