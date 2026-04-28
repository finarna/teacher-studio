
import fs from 'fs';
import { analyzeSubject } from '../REAL_2026_KCET/scripts/2_question_mapping_analyzer';

const realMath = JSON.parse(fs.readFileSync('./REAL_2026_KCET/extracted_real_papers/real_math_2026.json', 'utf-8'));
const setA = JSON.parse(fs.readFileSync('./flagship_final.json', 'utf-8'));
const setB = JSON.parse(fs.readFileSync('./flagship_final_b.json', 'utf-8'));

const report = analyzeSubject(realMath, setA, setB);

console.log("# KCET 2026 MATH: REAL VS PREDICTED MAPPING (60 REAL -> 120 PREDICTED)\n");
console.log("| Real Q# | Topic | SET-A Match | Score | SET-B Match | Score | Winning Set | Verdict |");
console.log("|:---:|:--- |:--- |:---:|:--- |:---:|:---:|:---:|");

report.questionAnalyses.forEach(qa => {
    const matchA = qa.bestMatchSetA;
    const matchB = qa.bestMatchSetB;
    const winningSet = qa.predictionAccuracy.setA >= qa.predictionAccuracy.setB ? 'A' : 'B';
    const verdict = qa.predictionAccuracy.verdict === 'hit' ? '✅ HIT' : (qa.predictionAccuracy.verdict === 'partial_hit' ? '⚠️ PARTIAL' : '❌ MISS');
    
    console.log(`| ${qa.questionNumber} | ${qa.topic} | Q${matchA?.questionNumber || '-'} (${matchA?.matchType || 'none'}) | ${qa.predictionAccuracy.setA} | Q${matchB?.questionNumber || '-'} (${matchB?.matchType || 'none'}) | ${qa.predictionAccuracy.setB} | SET ${winningSet} | ${verdict} |`);
});

const stats = report.statistics;
console.log("\n### Summary Statistics");
console.log(`- **Combined Coverage**: ${stats.combinedCoverage.toFixed(1)}%`);
console.log(`- **Average SET-A Accuracy**: ${stats.averageSetAAccuracy.toFixed(1)}/100`);
console.log(`- **Average SET-B Accuracy**: ${stats.averageSetBAccuracy.toFixed(1)}/100`);
console.log(`- **Exact Matches**: ${stats.exactMatches}`);
console.log(`- **Paraphrased Matches**: ${stats.paraphrasedMatches}`);
console.log(`- **Direct Identity Concept Hits**: ${stats.patternMatches}`);
