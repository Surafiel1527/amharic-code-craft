# Database Credentials & Sensitive Data Protection Guide

This platform includes robust security features for managing database credentials and protecting sensitive information.

## 🔒 Database Credentials Manager

### Overview
The Database Credentials Manager allows you to securely connect external databases to your projects without exposing credentials in your codebase.

### Supported Database Types
- **PostgreSQL** (Port: 5432)
- **MySQL** (Port: 3306)
- **MongoDB** (Port: 27017)
- **Redis** (Port: 6379)
- **Other** (Custom databases)

### How to Use

1. **Navigate to Settings**
   - Go to Settings page from your dashboard
   - Scroll to "Database Credentials Manager" section

2. **Enter Connection Details**
   - **Connection Name**: A friendly name for your database (e.g., "Production DB")
   - **Database Type**: Select from supported types
   - **Host**: Your database server address (e.g., `db.example.com` or `localhost`)
   - **Port**: Database port (auto-filled based on type)
   - **Database Name**: The specific database to connect to
   - **Username**: Database user with appropriate permissions
   - **Password**: Database password

3. **Test Connection**
   - Click "Test Connection" to verify credentials
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed (check your credentials)

4. **Save Credentials**
   - Once connection test passes, click "Save Credentials"
   - Credentials are encrypted and stored as Supabase secrets
   - Never exposed in your codebase or client-side

### Security Features

#### Encrypted Storage
- All credentials are encrypted using industry-standard encryption
- Stored as Supabase secrets (not in database tables)
- Only accessible by your backend edge functions

#### Environment Variable Format
When you save credentials for "Production DB", the following secrets are created:
```
DB_PRODUCTION_DB_TYPE=postgresql
DB_PRODUCTION_DB_HOST=db.example.com
DB_PRODUCTION_DB_PORT=5432
DB_PRODUCTION_DB_USERNAME=admin
DB_PRODUCTION_DB_PASSWORD=********
DB_PRODUCTION_DB_DATABASE=myapp
```

#### Using in Edge Functions
```typescript
// In your edge function
const dbConfig = {
  host: Deno.env.get('DB_PRODUCTION_DB_HOST'),
  port: parseInt(Deno.env.get('DB_PRODUCTION_DB_PORT') || '5432'),
  user: Deno.env.get('DB_PRODUCTION_DB_USERNAME'),
  password: Deno.env.get('DB_PRODUCTION_DB_PASSWORD'),
  database: Deno.env.get('DB_PRODUCTION_DB_DATABASE')
};

// Use with your database client
const client = new Client(dbConfig);
```

---

## ⚠️ Sensitive Data Detector

### What It Does
The platform automatically detects when you paste sensitive information in chat and warns you immediately.

### Detected Patterns

The system can identify:

1. **API Keys & Tokens**
   - OpenAI API keys (`sk-...`)
   - Google API keys (`AIza...`)
   - GitHub tokens (`ghp_...`)
   - Slack tokens (`xox...`)
   - Generic API keys and access keys

2. **Authentication Credentials**
   - Passwords (patterns like `password: xxxxx`)
   - Bearer tokens
   - Private keys (PEM format)

3. **Database Connection Strings**
   - PostgreSQL URLs (`postgres://...`)
   - MongoDB URLs (`mongodb://...`)
   - MySQL URLs (`mysql://...`)

4. **Personal Information**
   - Email addresses
   - IP addresses

### How It Works

1. **Real-time Detection**
   - Analyzes text as you type in chat
   - Instant visual warning appears

2. **Warning Display**
   - Shows specific types of sensitive data detected
   - Provides security recommendations
   - Can be dismissed if intentional

3. **Best Practices Guidance**
   - Recommends using "Add Secret" feature
   - Suggests Database Credentials Manager
   - Explains environment variable usage

### Example Warning

```
⚠️ Sensitive Information Detected

The following sensitive data was detected in your message:
• API key detected
• PostgreSQL connection string detected

🔒 Security Recommendations:
• Never share passwords, API keys, or credentials in chat
• Use the secure "Add Secret" feature for API keys
• Use the "Database Credentials" manager for database connections
• Connection strings should be stored as environment variables
```

---

## 🎯 Best Practices

### ✅ DO
- Use the Database Credentials Manager for all database connections
- Use "Add Secret" feature for API keys
- Store sensitive data as environment variables
- Test connections before deploying
- Use strong, unique passwords for each database

### ❌ DON'T
- Paste API keys directly in chat
- Share database passwords in plain text
- Hardcode credentials in your code
- Use weak or default passwords
- Store credentials in version control

---

## 🔧 Troubleshooting

### Connection Test Failed
1. **Check credentials**: Verify username, password, and database name
2. **Firewall settings**: Ensure your database allows connections from Supabase IP addresses
3. **Network access**: Verify the host address is accessible
4. **Port configuration**: Confirm you're using the correct port

### Credentials Not Working in Edge Functions
1. **Secret names**: Ensure you're using the correct environment variable names
2. **Deployment**: Secrets may need time to propagate after saving
3. **Function permissions**: Verify edge function has access to secrets

### Sensitive Data Warning Not Appearing
1. **Clear browser cache**: Sometimes detection needs a refresh
2. **Check pattern match**: Not all formats are detected (report if needed)
3. **Disable warning**: Can be dismissed per message

---

## 📚 Additional Resources

### Related Edge Functions
- `save-database-credentials` - Stores encrypted credentials
- `test-database-connection` - Validates connection parameters

### Components
- `DatabaseCredentialsManager.tsx` - UI for credential management
- `SensitiveDataDetector.tsx` - Real-time sensitive data detection
- `EnhancedChatInterface.tsx` - Integrated chat with security features

---

## 🆘 Need Help?

If you encounter issues or have questions:
1. Check the troubleshooting section above
2. Review your database firewall settings
3. Verify network connectivity
4. Contact support with specific error messages

**Remember**: Security is a shared responsibility. Always follow best practices for credential management and never expose sensitive data in your codebase or communications.
