# Self-Healing Database System

## 🎯 Overview

This system **automatically detects and handles database schema mismatches** without breaking generation flows. The platform gracefully degrades when encountering schema issues and logs them for review.

## How It Works

### 1. **Schema Introspection** (`schemaIntrospection.ts`)
- Queries actual table structure by selecting a sample row
- Caches schema for 5 minutes to minimize DB queries  
- Detects missing columns before attempting database operations

### 2. **Resilient Database Operations** (`resilientDb.ts`)
- Wraps all `insert` and `update` operations with validation
- Three-tier approach:
  1. **Schema Validation**: Checks columns exist before writing
  2. **Graceful Degradation**: Removes missing fields and continues
  3. **Issue Logging**: Logs schema mismatches with suggested fixes

### 3. **Auto-Fix Suggestions** (`schemaAutoFixer.ts`)
- Analyzes missing columns and suggests safe fixes
- Determines appropriate SQL commands to add missing columns
- Logs suggestions to `build_events` for review
- **Note**: Edge functions cannot execute ALTER TABLE, so suggestions are logged for manual application

## Usage Examples

### Before (Prone to Breakage):
```typescript
// Direct insert - fails if schema changes
const { error } = await supabase
  .from('generation_analytics')
  .insert({
    project_id: projectId,
    metadata: {...} // 💥 Breaks if metadata column doesn't exist
  });
```

### After (Self-Healing):
```typescript
import { resilientInsert } from '../_shared/resilientDb.ts';

// Resilient insert - handles schema mismatches automatically
const result = await resilientInsert(supabase, {
  tableName: 'generation_analytics',
  data: {
    project_id: projectId,
    metadata: {...} // ✅ Removes field gracefully if column doesn't exist
  },
  autoFix: true,    // Log suggested fixes
  critical: false   // Don't fail if some fields can't be logged
});

if (result.removedFields?.length) {
  console.warn(`⚠️ Removed missing fields: ${result.removedFields.join(', ')}`);
  // System logs suggested SQL to add these columns
}
```

## What Gets Handled?

### ✅ **Automatically Detected:**
- Missing JSONB columns
- Missing TEXT columns
- Missing INTEGER/NUMERIC columns
- Missing BOOLEAN columns
- Missing TIMESTAMP columns

### 🔧 **Suggested SQL Fixes:**
When columns are missing, the system logs SQL like:
```sql
ALTER TABLE generation_analytics 
ADD COLUMN metadata JSONB DEFAULT '{}';
```

You can review these suggestions in the `build_events` table.

## Monitoring

All schema issues are logged to:
- **`detected_errors`** table - Schema mismatch events
- **`build_events`** table - Suggested fixes with SQL commands

Query recent schema issues:
```sql
SELECT * FROM detected_errors 
WHERE error_type = 'schema_mismatch' 
ORDER BY created_at DESC 
LIMIT 20;
```

Query suggested fixes:
```sql
SELECT details FROM build_events 
WHERE event_type = 'schema_auto_fix'
ORDER BY created_at DESC 
LIMIT 20;
```

## Benefits

1. **Zero Downtime**: Schema changes don't break ongoing operations ✅
2. **Graceful Degradation**: Continues working without problematic fields ✅
3. **Full Visibility**: All issues logged with suggested SQL fixes ✅
4. **Context-Aware**: Different handling for critical vs non-critical fields ✅
5. **Self-Documenting**: Suggested migrations captured automatically ✅

## Example Real-World Scenario

**Problem**: The `generation_analytics` table is missing the `metadata` column

**Without This System**:
```
❌ Failed to log generation success: {
  "code": "PGRST204",
  "message": "Could not find the 'metadata' column"
}
💥 Generation breaks with error
```

**With This System**:
```
⚠️ Schema mismatch in generation_analytics
  Missing columns: metadata
✅ Removed missing field: metadata
✅ Generation success logged successfully (without metadata)
📝 Logged suggested fix: ALTER TABLE generation_analytics ADD COLUMN metadata JSONB DEFAULT '{}'
🎉 Generation completes without interruption
```

## Integration Points

Already integrated in:
- ✅ `productionMonitoring.ts` - Generation success logging

To integrate in new places:
```typescript
// Replace this:
await supabase.from('table_name').insert(data);

// With this:
import { resilientInsert } from '../_shared/resilientDb.ts';
await resilientInsert(supabase, {
  tableName: 'table_name',
  data,
  autoFix: true
});
```

## Future Enhancements

- [ ] Periodic schema sync checker
- [ ] Automatic migration file generation from suggestions
- [ ] Schema version tracking
- [ ] Dashboard for reviewing suggested fixes
- [ ] Batch migration application tool
