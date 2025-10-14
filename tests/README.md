# Automated Test Suite

## Running Tests

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run Specific Test Suite
```bash
npm test self-healing-system
```

### Watch Mode (for development)
```bash
npm test -- --watch
```

## Test Safety

All tests are **100% safe** and won't affect production:

✅ Uses `AUTO_TEST_` prefix for all test data
✅ Automatic cleanup after tests complete
✅ Isolated test data - no production impact
✅ Read-only checks on production tables

## Test Coverage

### 1. Admin Approval System
- Create/read/update approval items
- Approve/reject workflows
- Real-time queue updates

### 2. A/B Testing
- Experiment creation
- Variant routing
- Result recording
- Statistical significance

### 3. Rollback System
- Safety checks
- Rollback execution
- History tracking

### 4. Pattern Learning
- Pattern retrieval
- Confidence scoring
- Cross-project sharing

### 5. Auto-Generated Tests
- Test creation from failures
- Test execution
- Result tracking

### 6. System Health
- Success rate calculation
- Database function verification
- Performance metrics

## Test Results

After running tests, you'll see:
```
✅ Admin Approval System: TESTED
✅ A/B Testing Framework: TESTED
✅ Rollback System: TESTED
✅ Pattern Learning: TESTED
✅ Auto-Generated Tests: TESTED
✅ System Health: TESTED

🚀 All systems operational!
```

## Continuous Integration

These tests can be integrated into CI/CD pipelines:
```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: npm test
```
