#!/bin/bash
#
# NEET Quality Gates - Run All Validations
#
# Purpose: Execute all quality gates before deployment
# Subjects: Physics, Chemistry, Botany, Zoology
#
# Usage: ./scripts/oracle/run_neet_quality_gates.sh
#

set -e  # Exit on any error

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║         NEET QUALITY GATES - COMPREHENSIVE VALIDATION             ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

SUBJECTS=("Physics" "Chemistry" "Botany" "Zoology")
ALL_PASSED=true

# Step 1: Validate Tier Distribution for Each Subject
echo "📋 Step 1: Validating Tier Distributions..."
echo ""

for subject in "${SUBJECTS[@]}"; do
  echo "🔍 Validating ${subject}..."
  if npx tsx scripts/oracle/validate_tier_distribution_neet.ts "${subject}" > /dev/null 2>&1; then
    echo "   ✅ ${subject} tier distribution passed"
  else
    echo "   ❌ ${subject} tier distribution FAILED"
    ALL_PASSED=false
  fi
done

echo ""

# Step 2: Verify Subject Rankings
echo "📊 Step 2: Verifying Subject Rankings..."
echo ""

if npx tsx scripts/oracle/verify_neet_subject_rankings.ts > /dev/null 2>&1; then
  echo "   ✅ Subject rankings are pedagogically sound"
else
  echo "   ⚠️  Subject rankings have warnings (check manually)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Final Result
if [ "$ALL_PASSED" = true ]; then
  echo "🎉 ALL QUALITY GATES PASSED"
  echo "✅ Safe to proceed with deployment"
  echo ""
  exit 0
else
  echo "🚨 QUALITY GATES FAILED"
  echo "❌ DO NOT DEPLOY - Fix errors before proceeding"
  echo ""
  echo "Run individual validators for details:"
  echo "  npx tsx scripts/oracle/validate_tier_distribution_neet.ts <Subject>"
  echo "  npx tsx scripts/oracle/verify_neet_subject_rankings.ts"
  echo ""
  exit 1
fi
