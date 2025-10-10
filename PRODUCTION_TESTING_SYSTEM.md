# 🧪 Production Testing & Monitoring System

## Overview

We've transformed the existing test infrastructure into a **self-healing, production-aware testing system** that learns from real failures and automatically generates regression tests.

---

## 🏗️ System Architecture

```
Production Failures
       ↓
   Database Log
       ↓
Auto-Generate Test (after 3+ occurrences)
       ↓
   Test Runner
       ↓
Confidence Score Updates
```

---

## 📊 Database Schema

### 1. **generation_failures**
Tracks all production errors with rich metadata:
- Error type, message, stack trace
- User request & context
- Severity (low/medium/high/critical)
- Category (timeout, validation, dependency, syntax, rate limit)
- Occurrence count
- Auto-test generation status

### 2. **auto_generated_tests**
Tests created automatically from repeated failures:
- Test prompt (from failed user request)
- Expected behavior (JSON schema)
- Framework (html/react/vue)
- Confidence score (0-100, updated with each run)
- Run/pass/fail counts
- Tags & metadata

### 3. **test_execution_results**
Tracks every test run:
- Pass/fail status
- Duration
- Error messages
- Actual vs expected output
- Environment (dev/staging/production)
- Trigger source (manual/cron/CI/deployment)

---

## 🔄 Auto-Test Generation Trigger

**Database Trigger Logic:**
```sql
-- When a failure is logged:
IF failure_count >= 3 AND no_test_exists THEN
  CREATE auto_generated_test (
    name: 'regression_' + error_type,
    prompt: user_request,
    expected: { shouldNotFail: true, minimumFiles: 1 },
    confidence: 75
  )
END
```

**Example:**
1. User A gets "dependency validation failed" error
2. User B gets same error next day  
3. User C gets same error → **Test auto-generated!**
4. Test runs every 6 hours to catch regressions

---

## 🚀 Components

### 1. **Production Monitoring** (`productionMonitoring.ts`)

**Functions:**
- `logGenerationFailure()` - Logs errors to database
- `classifyError()` - Categorizes error type/severity
- `extractStackTrace()` - Captures debugging info

**Integrated into:** `mega-mind-orchestrator/index.ts`

**Example Usage:**
```typescript
catch (error) {
  const classification = classifyError(error);
  await logGenerationFailure(supabase, {
    errorType: error.name,
    errorMessage: error.message,
    userRequest: request,
    context: { framework, projectId },
    severity: classification.severity,
    category: classification.category
  });
}
```

### 2. **Auto Test Runner** (`auto-test-runner/index.ts`)

**Edge Function that:**
- Fetches active tests from database
- Runs them against `mega-mind-orchestrator`
- Validates output against expected behavior
- Updates test confidence scores
- Logs results to database

**Trigger Methods:**
```bash
# Run single test
supabase functions invoke auto-test-runner \
  --data '{"testId": "xxx"}'

# Run all tests
supabase functions invoke auto-test-runner \
  --data '{"runAll": true}'

# Schedule with cron (every 6 hours)
# Add to config.toml
```

### 3. **Production Testing Dashboard** (`ProductionTestingDashboard.tsx`)

**React Component showing:**
- ✅ Total tests / Active tests
- 📈 Confidence scores
- ⚠️ Recent failures
- ▶️ Run tests manually
- 📊 Pass/fail statistics
- 🏷️ Test tags & categories

**Access:** Add to admin/testing route

---

## 💡 How It Works

### Scenario: "Recipe Website" Test Case

**Day 1:**
```
User: "Build recipe website with search"
Result: ❌ Dependency validation error
Action: Log to generation_failures
```

**Day 2:**
```
Different User: Same error
Action: Update occurrence_count = 2
```

**Day 3:**
```
Third User: Same error occurs again
Action: ✨ Auto-generate test!
  - test_name: "regression_dependency_validation"
  - test_prompt: "Build recipe website with search"  
  - expected: { shouldNotFail: true }
  - confidence: 75
```

**Day 4+:**
```
Cron Job: Run auto-test-runner every 6 hours
Result: ✅ Test passes (bug was fixed!)
Action: confidence_score → 80
```

**Benefits:**
- ✅ Regression caught before production
- ✅ No manual test writing needed
- ✅ Tests based on real user scenarios
- ✅ Self-healing test suite

---

## 📈 Confidence Score System

Tests get smarter over time:

| Score | Meaning | Action |
|-------|---------|--------|
| 0-40 | Unreliable | Review test, might be flaky |
| 40-60 | Moderate | Test is learning patterns |
| 60-80 | Reliable | Good regression coverage |
| 80-100 | Highly Reliable | Production-critical test |

**Updates:**
- ✅ Pass → +5 points
- ❌ Fail → -10 points
- Max 100, Min 0

---

## 🎯 Test Types

### 1. **Smoke Tests**
Quick validation of core functionality:
- Simple HTML page generation
- Basic React component
- Database setup

### 2. **Regression Tests**
Auto-generated from production failures:
- Created when error occurs 3+ times
- Uses actual failed user request
- Validates error doesn't happen again

### 3. **Contract Tests**
Validate interfaces remain stable:
- AI response structure
- Orchestrator output format
- Database schema validation

### 4. **Integration Tests**
End-to-end validation:
- Full generation pipeline
- Multi-phase builds
- Complex features

---

## 🔧 Usage Guide

### For Developers

**View Test Dashboard:**
```tsx
import { ProductionTestingDashboard } from '@/components/ProductionTestingDashboard';

// Add to admin route
<Route path="/admin/testing" element={<ProductionTestingDashboard />} />
```

**Run Tests Manually:**
```bash
# Single test
curl -X POST https://[project].supabase.co/functions/v1/auto-test-runner \
  -H "Authorization: Bearer [key]" \
  -d '{"testId": "xxx"}'

# All tests
curl -X POST https://[project].supabase.co/functions/v1/auto-test-runner \
  -H "Authorization: Bearer [key]" \
  -d '{"runAll": true, "environment": "production"}'
```

**Query Test Results:**
```sql
-- View test health
SELECT 
  test_name,
  confidence_score,
  pass_count,
  fail_count,
  last_run_at
FROM auto_generated_tests
WHERE is_active = true
ORDER BY confidence_score DESC;

-- View recent failures
SELECT 
  error_type,
  occurrence_count,
  test_generated,
  created_at
FROM generation_failures
WHERE created_at > now() - INTERVAL '7 days'
ORDER BY occurrence_count DESC;
```

### For Platform Admins

**Monitor Production Health:**
1. Go to `/admin/testing` dashboard
2. Check "Recent Failures" section
3. Review auto-generated tests
4. Run tests before deployments

**Create Manual Tests:**
```sql
INSERT INTO auto_generated_tests (
  test_name,
  test_type,
  test_prompt,
  expected_behavior,
  framework,
  tags
) VALUES (
  'smoke_landing_page',
  'smoke',
  'Build a landing page with hero section',
  '{"minimumFiles": 1, "shouldNotFail": true}',
  'html',
  ARRAY['smoke', 'critical']
);
```

---

## 🎉 Benefits vs Traditional Testing

| Traditional Tests | Our System |
|-------------------|------------|
| Manual test writing | ✨ Auto-generated from failures |
| Mock data | 🎯 Real user scenarios |
| Stale tests | 🔄 Self-updating confidence |
| No production feedback | 📊 Continuous learning |
| Breaks on refactors | 🛡️ Contract-based validation |
| Static test suite | 📈 Growing with platform |

---

## 🚀 Next Steps

### Phase 1: ✅ Complete
- Database schema created
- Production monitoring integrated
- Auto-test-runner deployed
- Testing dashboard built

### Phase 2: Recommended
1. **Schedule Cron Job** - Run tests every 6 hours
2. **CI/CD Integration** - Block deployments if critical tests fail
3. **Alerts System** - Notify team when confidence drops
4. **Test Categorization** - Tag tests by feature/priority

### Phase 3: Advanced
1. **AI-Powered Analysis** - Let AI suggest test improvements
2. **Performance Benchmarks** - Track generation speed over time
3. **A/B Testing** - Compare different generation strategies
4. **User Feedback Loop** - Let users mark successful generations

---

## 📚 Files Modified/Created

### New Files:
- `supabase/functions/mega-mind-orchestrator/productionMonitoring.ts`
- `supabase/functions/auto-test-runner/index.ts`
- `src/components/ProductionTestingDashboard.tsx`

### Modified Files:
- `supabase/functions/mega-mind-orchestrator/index.ts`
- Database migration (3 new tables + triggers)

### Existing Tests:
- **Enhanced (not deleted!)** - Tests now validate contracts
- Can be extended to use real production data
- Integrated with auto-test generation system

---

## 💬 Philosophy

> "Don't write tests for code that doesn't break. Write tests for code that already broke."

This system ensures we only test what matters: **real production issues that real users encountered**.

---

## 🎯 Success Metrics

After 1 month, measure:
- **Coverage:** % of production errors with auto-tests
- **Regression Prevention:** # of caught issues before deployment
- **Confidence:** Average test confidence score
- **Self-Healing:** # of tests that improved over time

**Target Goals:**
- 80% of repeated errors have tests
- 95% test pass rate
- Average 75+ confidence score
- Zero critical regressions in production

---

**Status:** ✅ Production Ready
**Next:** Add to `/admin/testing` route and schedule cron job
