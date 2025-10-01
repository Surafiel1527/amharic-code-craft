-- Add extensive training data with more edge cases and advanced patterns

INSERT INTO public.error_patterns (error_type, error_pattern, solution, resolution_status, affected_model, auto_fix_success_rate, frequency) VALUES
-- Advanced React Patterns
('Error', 'Hydration failed because initial UI does not match', 'Ensure server and client render the same content. Check for browser-only APIs, random values, or date formatting differences.', 'solved', 'frontend', 0.87, 25),
('Error', 'Objects are not valid as React child', 'Render object properties individually or use JSON.stringify for debugging. Never render raw objects.', 'solved', 'frontend', 0.94, 40),
('Error', 'Too many re-renders React limits', 'Move state setter out of render. Use useCallback for functions passed to children. Check useEffect dependencies.', 'solved', 'frontend', 0.89, 35),
('TypeError', 'Cannot destructure property from undefined', 'Add default values in destructuring: const { prop = defaultValue } = obj || {}. Use optional chaining.', 'solved', 'frontend', 0.92, 45),
('Error', 'Minified React error 31', 'Component is not wrapped in Suspense boundary. Add <Suspense fallback={<Loading />}> wrapper.', 'solved', 'frontend', 0.91, 20),

-- Advanced Database Patterns
('DatabaseError', 'duplicate key value violates unique constraint', 'Use INSERT ... ON CONFLICT DO UPDATE or check for existing records before insert. Add proper unique indexes.', 'solved', 'database', 0.94, 60),
('DatabaseError', 'null value in column violates not-null constraint', 'Ensure all required fields have values before insert. Add default values in schema or validate input.', 'solved', 'database', 0.96, 55),
('DatabaseError', 'update or delete on table violates foreign key', 'Use CASCADE delete or check for dependent records. Update foreign keys before deleting parent records.', 'solved', 'database', 0.90, 30),
('DatabaseError', 'deadlock detected', 'Ensure consistent lock ordering. Use SELECT FOR UPDATE NOWAIT. Implement retry logic with exponential backoff.', 'solved', 'database', 0.82, 15),
('DatabaseError', 'could not serialize access due to concurrent update', 'Use appropriate transaction isolation level. Implement optimistic locking with version columns.', 'solved', 'database', 0.85, 18),

-- API Integration Errors
('Error', 'CORS policy no Access-Control-Allow-Origin', 'Add CORS headers to backend responses. Configure proxy in vite.config.ts or use edge function.', 'solved', 'api', 0.93, 50),
('Error', 'Request failed with status code 401', 'Check authentication token is valid and not expired. Implement token refresh logic.', 'solved', 'api', 0.91, 65),
('Error', 'Request failed with status code 403', 'Verify user has required permissions. Check RLS policies and role assignments.', 'solved', 'api', 0.89, 40),
('Error', 'Request failed with status code 500', 'Check server logs for detailed error. Validate request payload format. Ensure edge function returns proper Response.', 'solved', 'api', 0.86, 55),
('NetworkError', 'timeout of 10000ms exceeded', 'Increase timeout limit or optimize slow operation. Implement retry with exponential backoff.', 'solved', 'network', 0.88, 28),

-- Advanced TypeScript Errors
('TypeError', 'Type string is not assignable to type', 'Add proper type casting or update interface. Use TypeScript utility types like Partial or Pick.', 'solved', 'build', 0.95, 38),
('Error', 'Property does not exist on type', 'Add property to interface or use type assertion. Check for typos in property names.', 'solved', 'build', 0.93, 42),
('Error', 'Argument of type is not assignable to parameter', 'Fix type mismatch by updating function signature or casting argument. Use generics for flexible types.', 'solved', 'build', 0.91, 35),

-- Performance Issues
('Error', 'Memory leak detected', 'Clean up subscriptions in useEffect return. Remove event listeners. Clear timeouts and intervals.', 'solved', 'frontend', 0.84, 22),
('PerformanceWarning', 'Component re-rendering too frequently', 'Use React.memo for expensive components. Add useMemo for complex calculations. Optimize useEffect dependencies.', 'solved', 'frontend', 0.87, 30),
('Error', 'Maximum call stack size exceeded', 'Check for infinite recursion. Review recursive function base cases. Avoid circular dependencies.', 'solved', 'frontend', 0.90, 20),

-- Form & Validation Errors
('ValidationError', 'Email validation failed', 'Use proper email regex: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/. Consider using validation libraries like zod.', 'solved', 'frontend', 0.96, 48),
('ValidationError', 'Password does not meet requirements', 'Enforce min length 8, include uppercase, lowercase, number, special char. Display requirements clearly.', 'solved', 'frontend', 0.94, 35),
('Error', 'Form submission prevented invalid data', 'Validate all fields before submission. Show inline error messages. Disable submit until valid.', 'solved', 'frontend', 0.92, 40),

-- State Management Issues
('Error', 'Cannot update unmounted component', 'Check if component is mounted before setState. Use AbortController for fetch requests. Clean up in useEffect.', 'solved', 'frontend', 0.93, 45),
('Error', 'State updates from setTimeout', 'Use useRef to track mounted state. Clear timeout in useEffect cleanup. Consider using useCallback.', 'solved', 'frontend', 0.88, 28),

-- File Upload & Storage
('StorageError', 'File size exceeds maximum', 'Compress images before upload. Add client-side size validation. Use progressive upload for large files.', 'solved', 'storage', 0.91, 25),
('StorageError', 'Invalid file type', 'Validate MIME type on both client and server. Use accept attribute in file input. Check file extension.', 'solved', 'storage', 0.95, 30),
('StorageError', 'Storage bucket does not exist', 'Create bucket using Supabase storage.createBucket. Check bucket name spelling. Verify RLS policies.', 'solved', 'storage', 0.97, 18),

-- Real-time & WebSocket
('WebSocketError', 'Connection failed to establish', 'Check network connectivity. Verify WebSocket URL. Ensure server supports WebSocket protocol.', 'solved', 'network', 0.86, 22),
('RealtimeError', 'Subscription failed channel not found', 'Enable realtime on table using ALTER PUBLICATION. Check channel name. Verify RLS policies allow subscription.', 'solved', 'database', 0.90, 28),

-- Routing Errors
('Error', 'No routes matched location', 'Check route path spelling. Ensure all routes are defined. Add catch-all route for 404.', 'solved', 'frontend', 0.95, 32),
('Error', 'Navigate was called outside router', 'Wrap component in Router. Use useNavigate inside Router context. Check component hierarchy.', 'solved', 'frontend', 0.96, 26),

-- Data Fetching Patterns
('Error', 'No data returned from query', 'Use .maybeSingle() instead of .single() when data might not exist. Add null checks. Display empty state.', 'solved', 'database', 0.94, 40),
('Error', 'Stale data displayed after update', 'Invalidate cache after mutations. Use optimistic updates. Refetch or update local state immediately.', 'solved', 'frontend', 0.89, 35);