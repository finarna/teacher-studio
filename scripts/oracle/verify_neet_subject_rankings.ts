/**
 * NEET Subject Rankings Verifier
 *
 * Purpose: Verify subject rankings make pedagogical sense for NEET
 * Subjects: Physics, Chemistry, Botany, Zoology
 *
 * Expected Ranking (based on standardization):
 * 1. Chemistry (#1 or #2) - Highly standardized reactions
 * 2. Physics (#1 or #2) - Formula-based, predictable
 * 3. Botany/Zoology (#3 or #4) - More diverse, descriptive
 */

interface SubjectPerformance {
  subject: string;
  avgScore: number;
  tier1_2_pct: number;
  tier1_2_count: number;
  totalQuestions: number;
}

function verifyNEETSubjectRankings(performances: SubjectPerformance[]): {
  valid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Sort by tier1_2_pct descending
  const ranked = [...performances].sort((a, b) => b.tier1_2_pct - a.tier1_2_pct);

  console.log(`\n📊 NEET SUBJECT RANKINGS VERIFICATION`);
  console.log(`${'='.repeat(70)}`);
  ranked.forEach((p, idx) => {
    console.log(`   #${idx + 1}: ${p.subject.padEnd(12)} ${p.tier1_2_pct.toFixed(1)}% T1+2 (${p.tier1_2_count}/${p.totalQuestions}Q) | Avg: ${p.avgScore.toFixed(1)}/100`);
  });

  // Get rankings
  const chemRank = ranked.findIndex(p => p.subject === 'Chemistry') + 1;
  const physRank = ranked.findIndex(p => p.subject === 'Physics') + 1;
  const botanyRank = ranked.findIndex(p => p.subject === 'Botany') + 1;
  const zoologyRank = ranked.findIndex(p => p.subject === 'Zoology') + 1;

  // Validation Rules for NEET

  // 1. Chemistry should be #1 or #2 (highly standardized)
  if (chemRank > 2) {
    issues.push(`❌ Chemistry ranked #${chemRank} - expected #1 or #2 due to high reaction standardization`);
  }

  // 2. Physics should be #1 or #2 (formula-based)
  if (physRank > 2) {
    issues.push(`❌ Physics ranked #${physRank} - expected #1 or #2 due to formula-based nature`);
  }

  // 3. Biology (Botany/Zoology) should not outperform both Chemistry and Physics
  if (botanyRank === 1) {
    warnings.push(`⚠️  Botany ranked #1 - unusual, verify for potential scoring inflation`);
  }
  if (zoologyRank === 1) {
    warnings.push(`⚠️  Zoology ranked #1 - unusual, verify for potential scoring inflation`);
  }

  // 4. Check for large gaps (>20%) between adjacent subjects
  for (let i = 0; i < ranked.length - 1; i++) {
    const gap = ranked[i].tier1_2_pct - ranked[i + 1].tier1_2_pct;
    if (gap > 20) {
      warnings.push(`⚠️  Large gap (${gap.toFixed(1)}%) between #${i + 1} ${ranked[i].subject} and #${i + 2} ${ranked[i + 1].subject}`);
    }
  }

  // 5. Verify all subjects have reasonable Tier 1+2 (>50% for national exam)
  performances.forEach(p => {
    if (p.tier1_2_pct < 50) {
      warnings.push(`⚠️  ${p.subject} has low Tier 1+2 (${p.tier1_2_pct.toFixed(1)}%) - below 50% threshold`);
    }
  });

  console.log(`\n${'='.repeat(70)}`);

  if (issues.length > 0) {
    console.log(`\n❌ RANKING ANOMALIES DETECTED (${issues.length}):`);
    issues.forEach(issue => console.log(`   ${issue}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(warn => console.log(`   ${warn}`));
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log(`\n✅ Subject rankings are pedagogically sound for NEET`);
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

// CLI Usage - Example test
// Run test if executed directly
const runTest = () => {
  const testPerformances: SubjectPerformance[] = [
    {
      subject: 'Chemistry',
      avgScore: 88.5,
      tier1_2_pct: 82.0,
      tier1_2_count: 41,
      totalQuestions: 50
    },
    {
      subject: 'Physics',
      avgScore: 85.5,
      tier1_2_pct: 76.0,
      tier1_2_count: 38,
      totalQuestions: 50
    },
    {
      subject: 'Botany',
      avgScore: 79.2,
      tier1_2_pct: 72.0,
      tier1_2_count: 36,
      totalQuestions: 50
    },
    {
      subject: 'Zoology',
      avgScore: 77.8,
      tier1_2_pct: 70.0,
      tier1_2_count: 35,
      totalQuestions: 50
    }
  ];

  console.log(`\n🧪 NEET SUBJECT RANKING VALIDATOR - EXAMPLE TEST`);
  const result = verifyNEETSubjectRankings(testPerformances);

  if (!result.valid) {
    console.log(`\n🚨 RANKING VALIDATION FAILED`);
    process.exit(1);
  } else if (result.warnings.length > 0) {
    console.log(`\n⚠️  RANKING VALIDATION PASSED WITH WARNINGS`);
  } else {
    console.log(`\n🎉 RANKING VALIDATION PASSED\n`);
  }
};

// Run test
runTest();

export { verifyNEETSubjectRankings };
