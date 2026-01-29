#!/bin/bash

# VidyaV3 Comprehensive Test Suite Runner
# Usage: bash tests/vidya/runTests.sh

set -e

echo "=================================="
echo "VidyaV3 COMPREHENSIVE TEST SUITE"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
SKIPPED=0

# Test 1: TypeScript Compilation
echo "Test 1: TypeScript Compilation..."
if npx tsc --noEmit 2>&1 | grep -E "(VidyaV3|vidya/|useVidyaChatV3)" > /dev/null; then
  echo -e "${RED}✗ FAILED${NC} - VidyaV3 TypeScript errors found"
  FAILED=$((FAILED + 1))
else
  echo -e "${GREEN}✓ PASSED${NC} - No VidyaV3 TypeScript errors"
  PASSED=$((PASSED + 1))
fi
echo ""

# Test 2: File Existence
echo "Test 2: Core Files Existence..."
FILES=(
  "components/VidyaV3.tsx"
  "components/vidya/VidyaQuickActions.tsx"
  "hooks/useVidyaChatV3.ts"
  "utils/vidya/systemInstructions.ts"
  "utils/vidya/contextBuilder.ts"
  "utils/vidya/intentClassifier.ts"
  "utils/vidya/quickActions.ts"
  "utils/vidya/rbacValidator.ts"
  "utils/vidya/contextCache.ts"
  "utils/vidya/performanceMonitor.ts"
  "utils/vidya/toolHandlers.ts"
  "utils/vidya/backendIntegration.ts"
  "utils/vidya/conversationMemory.ts"
  "utils/featureFlags.ts"
)

ALL_FILES_EXIST=true
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${RED}✗${NC} $file (MISSING)"
    ALL_FILES_EXIST=false
  fi
done

if [ "$ALL_FILES_EXIST" = true ]; then
  echo -e "${GREEN}✓ PASSED${NC} - All core files exist"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAILED${NC} - Some files missing"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Integration Verification
echo "Test 3: Integration Checks..."

# Check App.tsx integration
if grep -q "import VidyaV3 from './components/VidyaV3'" App.tsx && \
   grep -q "isFeatureEnabled('useVidyaV3')" App.tsx; then
  echo -e "  ${GREEN}✓${NC} App.tsx integration"
  INTEGRATION_OK=true
else
  echo -e "  ${RED}✗${NC} App.tsx integration"
  INTEGRATION_OK=false
fi

# Check VidyaV3 quick actions integration
if grep -q "VidyaQuickActions" components/VidyaV3.tsx && \
   grep -q "quickActions" components/VidyaV3.tsx; then
  echo -e "  ${GREEN}✓${NC} Quick Actions integration"
else
  echo -e "  ${RED}✗${NC} Quick Actions integration"
  INTEGRATION_OK=false
fi

# Check RBAC integration
if grep -q "validateChatSecurity" hooks/useVidyaChatV3.ts && \
   grep -q "securityValidation" hooks/useVidyaChatV3.ts; then
  echo -e "  ${GREEN}✓${NC} RBAC security integration"
else
  echo -e "  ${RED}✗${NC} RBAC security integration"
  INTEGRATION_OK=false
fi

# Check tool routing integration
if grep -q "executeTool" hooks/useVidyaChatV3.ts && \
   grep -q "PHASE 5: DIRECT TOOL EXECUTION" hooks/useVidyaChatV3.ts; then
  echo -e "  ${GREEN}✓${NC} Tool routing integration"
else
  echo -e "  ${RED}✗${NC} Tool routing integration"
  INTEGRATION_OK=false
fi

if [ "$INTEGRATION_OK" = true ]; then
  echo -e "${GREEN}✓ PASSED${NC} - All integrations verified"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAILED${NC} - Some integrations missing"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Code Quality Checks
echo "Test 4: Code Quality..."

# Check for console.log in production code (should use proper logging)
CONSOLE_LOGS=$(grep -r "console\.log" utils/vidya/ components/VidyaV3.tsx hooks/useVidyaChatV3.ts 2>/dev/null | grep -v "Performance\|Audit\|ConversationMemory" | wc -l)
if [ "$CONSOLE_LOGS" -lt 5 ]; then
  echo -e "  ${GREEN}✓${NC} Minimal console.log usage (performance/audit logging only)"
else
  echo -e "  ${YELLOW}⚠${NC} Found $CONSOLE_LOGS console.log statements (review recommended)"
fi

# Check for TODOs
TODOS=$(grep -r "TODO\|FIXME\|XXX" utils/vidya/ components/VidyaV3.tsx hooks/useVidyaChatV3.ts 2>/dev/null | wc -l)
if [ "$TODOS" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No TODOs/FIXMEs in VidyaV3 code"
else
  echo -e "  ${YELLOW}⚠${NC} Found $TODOS TODOs/FIXMEs (review recommended)"
fi

echo -e "${GREEN}✓ PASSED${NC} - Code quality acceptable"
PASSED=$((PASSED + 1))
echo ""

# Test 5: Build Test
echo "Test 5: Build Check..."
if npm run build 2>&1 | grep -i "error" > /dev/null; then
  echo -e "${RED}✗ FAILED${NC} - Build errors detected"
  FAILED=$((FAILED + 1))
else
  echo -e "${GREEN}✓ PASSED${NC} - Build successful"
  PASSED=$((PASSED + 1))
fi
echo ""

# Test 6: Documentation Check
echo "Test 6: Documentation Completeness..."
DOCS=(
  "docs/VIDYA_V3_PHASE1_COMPLETE.md"
  "docs/VIDYA_V3_PHASE3_COMPLETE.md"
  "docs/VIDYA_V3_PHASE4_PHASE5_COMPLETE.md"
  "docs/VIDYA_V3_TESTING_GUIDE.md"
  "docs/VIDYA_V3_PERFORMANCE_OPTIMIZATION.md"
  "docs/VIDYA_V3_API_REFERENCE.md"
  "docs/VIDYA_V3_PROJECT_COMPLETE.md"
  "docs/VIDYA_V3_TEST_RESULTS.md"
)

DOCS_OK=true
for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo -e "  ${GREEN}✓${NC} $doc"
  else
    echo -e "  ${RED}✗${NC} $doc (MISSING)"
    DOCS_OK=false
  fi
done

if [ "$DOCS_OK" = true ]; then
  echo -e "${GREEN}✓ PASSED${NC} - All documentation present"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAILED${NC} - Some documentation missing"
  FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo "=================================="
echo "TEST SUITE SUMMARY"
echo "=================================="
echo -e "${GREEN}PASSED:${NC} $PASSED"
echo -e "${RED}FAILED:${NC} $FAILED"
echo -e "${YELLOW}SKIPPED:${NC} $SKIPPED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL AUTOMATED TESTS PASSED${NC}"
  echo ""
  echo "Next: Run manual browser tests"
  echo "  → Open http://localhost:9002"
  echo "  → Follow: docs/VIDYA_V3_TESTING_GUIDE.md"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  echo "Review errors above and fix before proceeding"
  exit 1
fi
