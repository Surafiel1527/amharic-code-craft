-- Add common error patterns as training data for the self-healing system

INSERT INTO public.error_patterns (error_type, error_pattern, solution, resolution_status, affected_model, auto_fix_success_rate, frequency) VALUES
-- React/Frontend Errors
('ReferenceError', 'Cannot read property of undefined', 'Add null checks before accessing nested properties. Use optional chaining (?.) or check if object exists before accessing properties.', 'solved', 'frontend', 0.95, 150),
('TypeError', 'Cannot read properties of null', 'Ensure the element/object exists before accessing its properties. Add conditional rendering or null checks.', 'solved', 'frontend', 0.92, 120),
('ReferenceError', 'variable is not defined', 'Import the missing variable/function or check for typos in the variable name.', 'solved', 'frontend', 0.98, 100),
('TypeError', 'map is not a function', 'Ensure the variable is an array before calling .map(). Add Array.isArray() check or provide default empty array.', 'solved', 'frontend', 0.94, 80),
('Error', 'Maximum update depth exceeded', 'Avoid setting state in render or in useEffect without proper dependencies. Use useCallback/useMemo appropriately.', 'solved', 'frontend', 0.88, 60),

-- Database/RLS Errors
('DatabaseError', 'infinite recursion detected in policy', 'Create a security definer function to avoid recursive RLS policy checks. Never reference the same table in its own RLS policy.', 'solved', 'database', 0.96, 45),
('DatabaseError', 'new row violates row-level security policy', 'Ensure user_id is set to auth.uid() when inserting. Check RLS policies allow the operation.', 'solved', 'database', 0.93, 85),
('PostgrestError', 'JWT expired', 'Implement automatic token refresh using supabase.auth.onAuthStateChange. Store full session object, not just user.', 'solved', 'authentication', 0.97, 70),
('DatabaseError', 'permission denied for table', 'Add appropriate RLS policies for SELECT/INSERT/UPDATE/DELETE operations.', 'solved', 'database', 0.94, 55),
('DatabaseError', 'relation does not exist', 'Run database migration to create the missing table or check for typos in table name.', 'solved', 'database', 0.99, 40),

-- API/Network Errors
('NetworkError', 'Failed to fetch', 'Check network connectivity, CORS headers, and API endpoint availability. Add error handling and retry logic.', 'solved', 'network', 0.85, 90),
('Error', '429 Too Many Requests', 'Implement rate limiting on client side with exponential backoff. Cache responses when possible.', 'solved', 'api', 0.91, 35),
('Error', '402 Payment Required', 'User has run out of API credits. Display message to add funds or upgrade plan.', 'solved', 'api', 0.99, 25),
('TypeError', 'Failed to parse JSON', 'Validate response is valid JSON before parsing. Add try-catch around JSON.parse().', 'solved', 'api', 0.93, 50),

-- Edge Function Errors
('Error', 'Function returned undefined', 'Ensure edge function returns a Response object with proper headers and status code.', 'solved', 'edge-function', 0.90, 30),
('Error', 'CORS error in edge function', 'Add corsHeaders to all responses including OPTIONS preflight and error responses.', 'solved', 'edge-function', 0.95, 45),
('ReferenceError', 'Deno environment variable undefined', 'Ensure environment variable is set in Supabase secrets. Check for typos in variable name.', 'solved', 'edge-function', 0.97, 40),

-- Authentication Errors
('AuthError', 'User already registered', 'Check if user exists before signup. Display friendly error message suggesting login instead.', 'solved', 'authentication', 0.94, 65),
('AuthError', 'Invalid login credentials', 'Verify email/password are correct. Implement password reset flow.', 'solved', 'authentication', 0.88, 80),
('AuthError', 'Email not confirmed', 'Enable auto-confirm in auth settings for development. Send confirmation email in production.', 'solved', 'authentication', 0.92, 50),

-- Build/Dependency Errors
('Error', 'Module not found', 'Install missing dependency with npm/pnpm. Check import path is correct.', 'solved', 'build', 0.96, 55),
('SyntaxError', 'Unexpected token', 'Check for missing brackets, quotes, or semicolons. Validate JSON syntax.', 'solved', 'build', 0.90, 45),

-- React Hook Errors
('Error', 'Rendered more hooks than previous render', 'Do not call hooks conditionally. Hooks must be called in the same order every render.', 'solved', 'frontend', 0.93, 35),
('Error', 'Cannot update component while rendering', 'Move state updates outside of render. Use useEffect for side effects.', 'solved', 'frontend', 0.89, 40);