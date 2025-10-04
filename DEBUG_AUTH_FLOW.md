# 🔍 Authentication Debugging Guide

## Current Issue
`smart-orchestrator` edge function returns 500 error with "Auth session missing"

## Debugging Steps

### 1. Check User Login Status
```typescript
// In browser console on /auth page:
const { data: { session } } = await window.supabase.auth.getSession()
console.log('Session:', session)
console.log('User:', session?.user)
console.log('Access Token:', session?.access_token?.substring(0, 50))
```

**Expected**: Should show valid session with access_token

### 2. Check Authorization Header
```typescript
// The Supabase SDK should automatically include this header
// when calling functions.invoke()
// Header format: "Bearer <access_token>"
```

**Check**: Edge function logs should show "Authorization header present"

### 3. Verify JWT Token
```typescript
// The edge function uses getUser() to validate the JWT
// This extracts user info from the Bearer token
```

**Expected**: Edge function logs: "✅ User authenticated successfully"

## Common Failure Modes

### A. Session Expired
**Symptom**: No session when checking in console
**Solution**: User needs to log in again

### B. Authorization Header Not Sent
**Symptom**: Edge function logs "❌ Missing Authorization header"
**Cause**: Supabase SDK not including header automatically
**Solution**: Check if session exists before calling function

### C. Invalid JWT Token
**Symptom**: "Authentication error: AuthSessionMissingError"
**Cause**: Token format wrong or expired
**Solution**: Refresh session before API call

### D. Edge Function Config
**Symptom**: Authentication bypassed
**Check**: `supabase/config.toml` has `verify_jwt = true`
**Current**: ✅ Correctly set to true

## Testing Flow

### Manual Test Steps

1. **Verify Login**:
   ```
   - Go to /auth
   - Check if you're logged in (should redirect to dashboard)
   - If not, log in with email/password
   ```

2. **Create Project**:
   ```
   - Go to dashboard
   - Click "New Project"
   - Fill form: Name + Prompt
   - Click "Generate Project"
   ```

3. **Check Console**:
   ```
   Browser Console:
   ✅ Session validated for user: [id]
   ✅ Project created: [project-id]
   ✅ Authentication validated - User: [user-id]
   ✅ Fresh session obtained
   📡 Calling smart-orchestrator...
   
   Edge Function Logs:
   📥 Smart orchestrator request received
   ✅ Authorization header present
   🔐 Validating user authentication...
   ✅ User authenticated successfully
   ```

4. **If Authentication Fails**:
   ```
   a. Check session in browser console
   b. Try logging out and back in
   c. Check edge function logs for specific error
   d. Verify Authorization header is being sent
   ```

## Potential Fixes

### Fix 1: Explicit Session Refresh
Added in ChatInterface before API call:
```typescript
const { data: { session: freshSession } } = await supabase.auth.getSession();
if (!freshSession?.access_token) {
  throw new Error('Session expired');
}
```

### Fix 2: Enhanced Edge Function Logging
Added detailed logging to see exactly where auth fails:
```typescript
- Request details
- Auth header format check
- User validation with specific error codes
- Email confirmation status
```

### Fix 3: Supabase Client Config
Ensure edge function client properly configured:
```typescript
createClient(url, key, {
  global: { headers: { Authorization: authHeader } },
  auth: { 
    persistSession: false,
    autoRefreshToken: false 
  }
})
```

## Next Steps

1. **User logs in** to the application
2. **Create a new project** via the dashboard
3. **Check browser console** for auth validation logs
4. **Check edge function logs** via Lovable Cloud dashboard
5. **Report findings** with specific log messages

## Expected Logs (Success Case)

### Browser Console
```
✅ Session validated for user: abc-123
✅ Project created: project-xyz
🔐 Validating authentication...
✅ Authentication validated - User: abc-123
✅ Session valid - Expires: 2025-10-04T17:00:00Z
✅ Fresh session obtained, token length: 856
🎯 Auto-send conditions met, initializing...
🚀 Executing auto-send with prompt: create fully...
📡 Calling smart-orchestrator...
   - Conversation: conv-123
   - Has existing code: false
   - Session access token available: true
   - Fresh session obtained, token length: 856
📥 Response received from smart-orchestrator
   - Has data: true
   - Has error: false
```

### Edge Function Logs
```
📥 Smart orchestrator request received
   - User request length: 35
   - Conversation ID: conv-123
   - Has current code: false
✅ Authorization header present
   Token preview: Bearer eyJhbGciOiJIUzI1NiIsInR...
🔐 Validating user authentication...
✅ User authenticated successfully
   User ID: abc-123
   Email: user@example.com
   Email confirmed: Yes
```

## If Still Failing

Contact support with:
1. Browser console logs (screenshot)
2. Edge function logs (from Cloud dashboard)
3. Exact error message
4. Steps taken before error occurred
