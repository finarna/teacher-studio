/**
 * NEET Tier Distribution Validator - ALL SUBJECTS
 *
 * Purpose: Validates forensic audit tier distributions for all NEET subjects
 * Subjects: Physics, Chemistry, Botany, Zoology
 * Prevents deployment of flawed calibrations with statistical anomalies
 */

interface TierDistributionLimits {
  subject: string;
  tier1_min: number;  // % minimum
  tier1_max: number;  // % maximum
  tier2_min: number;
  tier2_max: number;
  avgScore_min: number;
  avgScore_max: number;
}

// NEET Sanity Limits (National Exam - All 4 Subjects)
const NEET_SANITY_LIMITS: Record<string, TierDistributionLimits> = {
  'Physics': {
    subject: 'Physics',
    tier1_min: 0,
    tier1_max: 3,      // Max 3% exact hits
    tier2_min: 70,     // National exam - higher target
    tier2_max: 85,
    avgScore_min: 80,
    avgScore_max: 92
  },
  'Chemistry': {
    subject: 'Chemistry',
    tier1_min: 0,
    tier1_max: 5,      // Max 5% exact hits (reactions can be standardized)
    tier2_min: 75,     // National exam - highest target (most standardized)
    tier2_max: 90,
    avgScore_min: 85,
    avgScore_max: 95
  },
  'Botany': {
    subject: 'Botany',
    tier1_min: 0,
    tier1_max: 3,
    tier2_min: 70,     // Match Physics/Chemistry standard
    tier2_max: 85,
    avgScore_min: 78,
    avgScore_max: 90
  },
  'Zoology': {
    subject: 'Zoology',
    tier1_min: 0,
    tier1_max: 3,
    tier2_min: 70,     // Match Physics/Chemistry standard
    tier2_max: 85,
    avgScore_min: 78,
    avgScore_max: 90
  }
};

interface ForensicReport {
  subject: string;
  totalQuestions: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;
  tier5Count: number;
  avgScore: number;
}

function validateTierDistribution(report: ForensicReport): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const limits = NEET_SANITY_LIMITS[report.subject];
  if (!limits) {
    return {
      valid: false,
      errors: [`No limits defined for ${report.subject}. Valid subjects: ${Object.keys(NEET_SANITY_LIMITS).join(', ')}`],
      warnings: []
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate percentages
  const tier1Pct = (report.tier1Count / report.totalQuestions) * 100;
  const tier2Pct = (report.tier2Count / report.totalQuestions) * 100;
  const tier1_2Pct = tier1Pct + tier2Pct;

  console.log(`\n🔍 VALIDATING ${report.subject} FORENSIC REPORT`);
  console.log(`${'='.repeat(70)}`);
  console.log(`   Total Questions: ${report.totalQuestions}`);
  console.log(`   Tier 1 (98-100): ${report.tier1Count} (${tier1Pct.toFixed(1)}%)`);
  console.log(`   Tier 2 (80-94):  ${report.tier2Count} (${tier2Pct.toFixed(1)}%)`);
  console.log(`   Tier 1+2 Total:  ${report.tier1Count + report.tier2Count} (${tier1_2Pct.toFixed(1)}%)`);
  console.log(`   Avg Score:       ${report.avgScore.toFixed(1)}/100\n`);

  // Validate Tier 1
  if (tier1Pct < limits.tier1_min || tier1Pct > limits.tier1_max) {
    errors.push(
      `❌ Tier 1 ${tier1Pct.toFixed(1)}% outside valid range ${limits.tier1_min}-${limits.tier1_max}%`
    );
  } else {
    console.log(`✅ Tier 1: ${tier1Pct.toFixed(1)}% (within ${limits.tier1_min}-${limits.tier1_max}% range)`);
  }

  // Validate Tier 2
  if (tier2Pct < limits.tier2_min || tier2Pct > limits.tier2_max) {
    errors.push(
      `❌ Tier 2 ${tier2Pct.toFixed(1)}% outside valid range ${limits.tier2_min}-${limits.tier2_max}%`
    );
  } else {
    console.log(`✅ Tier 2: ${tier2Pct.toFixed(1)}% (within ${limits.tier2_min}-${limits.tier2_max}% range)`);
  }

  // Validate average score
  if (report.avgScore < limits.avgScore_min || report.avgScore > limits.avgScore_max) {
    errors.push(
      `❌ Avg score ${report.avgScore.toFixed(1)} outside valid range ${limits.avgScore_min}-${limits.avgScore_max}`
    );
  } else {
    console.log(`✅ Avg Score: ${report.avgScore.toFixed(1)} (within ${limits.avgScore_min}-${limits.avgScore_max} range)`);
  }

  // Validate total adds to 100%
  const totalPct = tier1Pct + tier2Pct +
    (report.tier3Count / report.totalQuestions * 100) +
    (report.tier4Count / report.totalQuestions * 100) +
    (report.tier5Count / report.totalQuestions * 100);

  if (Math.abs(totalPct - 100) > 0.5) {
    errors.push(`❌ Tier percentages sum to ${totalPct.toFixed(1)}%, should be 100%`);
  } else {
    console.log(`✅ Total percentages: ${totalPct.toFixed(1)}% (sums to ~100%)`);
  }

  // Warnings for borderline cases
  if (tier1_2Pct < limits.tier2_min + 5) {
    warnings.push(`⚠️  Tier 1+2 total (${tier1_2Pct.toFixed(1)}%) is close to minimum threshold`);
  }

  if (tier1Pct === 0) {
    console.log(`\n💡 Note: 0% Tier 1 is IDEAL for NEET - shows no overfitting!`);
  }

  console.log(`\n${'='.repeat(70)}`);

  if (errors.length === 0) {
    console.log(`✅ VALIDATION PASSED - All metrics within sanity limits`);
  } else {
    console.log(`❌ VALIDATION FAILED - ${errors.length} error(s) detected`);
    errors.forEach(err => console.log(`   ${err}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(warn => console.log(`   ${warn}`));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// CLI Usage
if (process.argv.length > 2) {
  const subject = process.argv[2];

  if (!NEET_SANITY_LIMITS[subject]) {
    console.error(`\n❌ Invalid subject: ${subject}`);
    console.error(`   Valid subjects: ${Object.keys(NEET_SANITY_LIMITS).join(', ')}\n`);
    process.exit(1);
  }

  // Example/Test validation
  const testReport: ForensicReport = {
    subject: subject,
    totalQuestions: 50,
    tier1Count: 0,
    tier2Count: 38,
    tier3Count: 8,
    tier4Count: 3,
    tier5Count: 1,
    avgScore: 85.5
  };

  console.log(`\n🧪 NEET ${subject.toUpperCase()} TIER DISTRIBUTION VALIDATOR`);
  console.log(`${'='.repeat(70)}\n`);

  const limits = NEET_SANITY_LIMITS[subject];
  console.log(`📋 Sanity Limits for NEET ${subject}:`);
  console.log(`   Tier 1: ${limits.tier1_min}-${limits.tier1_max}%`);
  console.log(`   Tier 2: ${limits.tier2_min}-${limits.tier2_max}%`);
  console.log(`   Avg Score: ${limits.avgScore_min}-${limits.avgScore_max}/100`);

  console.log(`\n📊 Example Validation:`);
  const result = validateTierDistribution(testReport);

  if (!result.valid) {
    console.log(`\n🚨 QUALITY GATE FAILED - DO NOT DEPLOY`);
    process.exit(1);
  } else {
    console.log(`\n🎉 QUALITY GATE PASSED - Safe to proceed\n`);
  }
}

export { validateTierDistribution, NEET_SANITY_LIMITS };
