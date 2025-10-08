# Supabase Auto-Configuration System

## 🎯 Overview

This platform now features **full Supabase integration** where AI automatically:
1. Analyzes your project requirements
2. Generates database schemas with RLS policies
3. Creates tables in YOUR Supabase database
4. Injects YOUR credentials into generated code
5. Provides migration SQL files for records

## 🚀 How It Works

### Step 1: Connect Your Supabase Project

1. Go to **Homepage** → **Supabase Connections** section
2. Click "Connect Project"
3. Enter your Supabase credentials:
   - **Project Name**: A friendly name for your project
   - **Supabase URL**: Found in Supabase Dashboard → Settings → API → Project URL
   - **Anon Key**: Found in Supabase Dashboard → Settings → API → Project API keys → anon public
   - **Service Role Key**: Found in Supabase Dashboard → Settings → API → Project API keys → service_role (secret!)

4. Click "Test Connection" to verify
5. Save your connection

### Step 2: Generate Your Project

When you generate a project that needs a database:

```
Example: "Create a blog website with posts and comments"
```

The system will **automatically**:

#### 🧠 AI Analysis
- Detects you need database tables (posts, comments)
- Determines fields and relationships
- Decides if authentication is needed
- Plans RLS (Row Level Security) policies

#### 🔧 Database Setup
1. **Auto-creates** the `execute_migration` function if missing
2. **Generates SQL** for your tables with proper types
3. **Creates RLS policies** to protect user data
4. **Executes migration** on YOUR Supabase database
5. **Validates** that everything was created successfully

#### 💻 Code Generation
1. **Creates Supabase client file** with YOUR credentials:
   ```javascript
   // src/lib/supabase.js
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = 'YOUR_ACTUAL_URL';
   const supabaseAnonKey = 'YOUR_ACTUAL_KEY';
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

2. **Generates full CRUD operations**:
   ```javascript
   // Fetch posts
   const { data: posts } = await supabase
     .from('posts')
     .select('*')
     .order('created_at', { ascending: false });
   
   // Create post
   const { error } = await supabase
     .from('posts')
     .insert({ title, content, user_id: user.id });
   ```

3. **Includes error handling and loading states**
4. **Adds authentication** if needed

#### 📦 Migration Files
Creates `migrations/` folder with:
- **SQL migration file** with exact SQL that was executed
- **README** with table documentation and connection info

## 🔐 Security & Privacy

### What Data Is Stored Where?

1. **Your Supabase Connection** (stored in platform database):
   - Project name
   - Supabase URL
   - Anon key
   - Service role key (encrypted)
   - Only YOU can access these

2. **Your User Data** (stored in YOUR Supabase):
   - All tables created by AI
   - All user-generated content
   - Protected by RLS policies
   - YOU have full control

3. **Generated Project Files** (stored in platform database):
   - Project files and versions
   - Conversation history
   - Available to YOU only

### Row Level Security (RLS)

All tables are created with RLS enabled:

**For user-specific data:**
```sql
-- Users can only see/edit their own data
create policy "Users can view their own posts"
  on public.posts for select 
  using (auth.uid() = user_id);
```

**For authenticated users:**
```sql
-- Any logged-in user can access
create policy "Authenticated users can view posts"
  on public.posts for select 
  using (auth.role() = 'authenticated');
```

**For public data:**
```sql
-- Anyone can access (no auth required)
create policy "Public can view posts"
  on public.posts for select 
  using (true);
```

## 🛠️ First-Time Setup

### Required: Execute Migration Function

The first time you use database features, you need to create this function in YOUR Supabase:

1. Go to your Supabase Dashboard
2. Click **SQL Editor**
3. Click **New Query**
4. Paste this SQL:

```sql
CREATE OR REPLACE FUNCTION public.execute_migration(migration_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  error_message text;
BEGIN
  BEGIN
    EXECUTE migration_sql;
    result := jsonb_build_object(
      'success', true,
      'message', 'Migration executed successfully'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    result := jsonb_build_object(
      'success', false,
      'error', error_message
    );
  END;
  
  RETURN result;
END;
$$;
```

5. Click **Run**
6. ✅ Done! You only need to do this once per Supabase project

> **Note**: The system tries to auto-create this function, but if it fails, you'll see helpful instructions in the generation UI.

## 📖 Example Scenarios

### Scenario 1: Blog Website

**User Request:**
```
Create a blog website with posts, comments, and user profiles
```

**AI Creates:**
- ✅ `posts` table with title, content, user_id
- ✅ `comments` table with post_id, user_id, content
- ✅ `profiles` table with user_id, display_name, avatar_url
- ✅ RLS policies for each table
- ✅ Authentication system (sign up, login, logout)
- ✅ Full blog UI with create/edit/delete posts
- ✅ Comments system
- ✅ User profiles

**Your Supabase:**
```sql
-- Tables created in YOUR database:
public.posts (id, user_id, title, content, created_at)
public.comments (id, post_id, user_id, content, created_at)
public.profiles (id, user_id, display_name, avatar_url, created_at)
```

**Generated Code:**
```javascript
// src/lib/supabase.js - with YOUR credentials
export const supabase = createClient(YOUR_URL, YOUR_KEY);

// src/pages/Blog.jsx - full implementation
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    profiles (display_name),
    comments (count)
  `)
  .order('created_at', { ascending: false });
```

### Scenario 2: Todo App

**User Request:**
```
Build a simple todo list app
```

**AI Creates:**
- ✅ `todos` table with title, completed, user_id
- ✅ RLS policies (users see only their todos)
- ✅ Authentication
- ✅ Todo UI with add, toggle, delete
- ✅ Filter by completed/active

### Scenario 3: E-commerce Store

**User Request:**
```
Create an online store with products and shopping cart
```

**AI Creates:**
- ✅ `products` table (public access)
- ✅ `cart_items` table (user-specific)
- ✅ `orders` table (user-specific)
- ✅ Authentication
- ✅ Product listing and details
- ✅ Shopping cart functionality
- ✅ Checkout flow

## 🐛 Troubleshooting

### "No active Supabase connection found"

**Solution:** 
1. Go to Homepage → Supabase Connections
2. Make sure you have a connection set as "Active"
3. If not, click "Set Active" on the connection you want to use

### "First-time database setup required"

**Solution:**
1. The `execute_migration` function doesn't exist
2. Follow the SQL in the error message
3. Run it once in your Supabase SQL Editor
4. Try generating again

### "Authentication failed with your database"

**Possible causes:**
- Service Role Key is invalid or expired
- Service Role Key doesn't have admin permissions

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Copy a fresh `service_role` key (keep it secret!)
3. Update your connection with the new key

### "Tables already exist" Error

**Solution:**
1. Check your Supabase Dashboard → Table Editor
2. If tables exist but are wrong, delete them
3. Regenerate the project
4. Or: Modify your request to update existing tables

### Generated Code Not Connecting

**Check:**
1. Look at the generated `supabase.js` or `supabase-client.js` file
2. Verify it has YOUR actual URL and key (not placeholders)
3. Check browser console for connection errors
4. Verify your Anon Key is correct

## 🎓 Best Practices

### 1. Use Descriptive Connection Names
```
✅ "My Blog Project - Production"
✅ "E-commerce Store - Development"
❌ "Project 1"
❌ "Test"
```

### 2. Keep Service Role Keys Secure
- Never commit to git
- Never share publicly
- Rotate regularly
- Use separate keys for dev/prod

### 3. Test Connections Regularly
- Click "Test Connection" periodically
- Ensures keys are still valid
- Detects connectivity issues early

### 4. Review Generated RLS Policies
- Open Supabase Dashboard → Authentication → Policies
- Verify policies match your security needs
- Adjust if necessary for your use case

### 5. Use Migration Files
- Keep the `migrations/` folder in your project
- Version control it
- Use it to recreate DB on another Supabase project

## 📚 Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Row Level Security Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **JavaScript Client Library**: https://supabase.com/docs/reference/javascript/installing

## 💡 Tips & Tricks

### Multi-Project Management

You can connect multiple Supabase projects:
1. Add all your projects
2. Switch active project anytime
3. Generated code automatically uses active project credentials

### Environment Separation

Best practice for dev/staging/production:
1. Create separate Supabase projects
2. Connect all to this platform
3. Switch active connection based on what you're working on
4. Each generated project targets the active connection

### Schema Iteration

To modify your database schema:
1. Request changes: "Add a tags field to posts"
2. AI generates ALTER TABLE statements
3. Updates your Supabase automatically
4. Provides migration SQL for version control

---

## 🎉 Success!

You now have a **fully integrated** system where:
- ✅ AI generates production-ready code
- ✅ YOUR Supabase database is auto-configured
- ✅ YOUR credentials are securely injected
- ✅ RLS protects your user data
- ✅ Migration files document everything
- ✅ You have full control over your data

**Need Help?**
Check the troubleshooting section above or review generated migration files for exact SQL that was executed.
