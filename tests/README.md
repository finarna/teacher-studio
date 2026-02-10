# Test Suite Documentation

This directory contains unit tests for critical functionality in EduJourney.

## Running Tests

```bash
# Run all tests
npm test

# Or run specific test file
node tests/useFilteredScans.test.js
```

## Test Files

### `useFilteredScans.test.js`

**Purpose**: Tests the critical filtering logic for multi-subject and multi-exam support

**What it tests**:
- ✅ Subject filtering (scans filtered by active subject)
- ✅ Exam context filtering (scans filtered by active exam)
- ✅ Data isolation (no leakage across exam contexts)
- ✅ Combined filters (subject + exam work together)
- ✅ Edge cases (empty arrays, null values, case sensitivity)

**Critical Bug Fixed**:
This test suite verifies the fix for a data leakage bug where scans without `examContext` were appearing in ALL exam contexts. The fix ensures strict matching:
- Before: `!scan.examContext || scan.examContext === activeExamContext`
- After: `scan.examContext === activeExamContext`

**Test Coverage**: 16 tests covering:
1. Subject filtering (3 tests)
2. Exam context filtering (3 tests)
3. Data isolation (3 tests)
4. Combined filters (3 tests)
5. Edge cases (4 tests)

## Test Results

All tests must pass before deployment:

```
✅ Passed: 16
❌ Failed: 0
📝 Total:  16
```

## Adding New Tests

To add new tests:

1. Create a new test file: `tests/your-feature.test.js`
2. Follow the pattern in `useFilteredScans.test.js`
3. Add test script to `package.json`
4. Update this README

## Test Structure

Each test file should:
- Import/mock necessary dependencies
- Define test utilities (assert, describe, it)
- Organize tests into logical suites
- Print clear pass/fail results
- Exit with appropriate code (0 = pass, 1 = fail)

## CI/CD Integration

Tests are run automatically:
- Before production builds
- In GitHub Actions workflows
- During local development (optional)

---

**Last Updated**: February 4, 2026
**Test Coverage**: Multi-subject filtering logic
**Status**: All tests passing ✅
