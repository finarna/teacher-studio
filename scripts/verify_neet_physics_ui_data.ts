import { getPredictedPapers } from '../utils/predictedPapersData';

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║          VERIFYING NEET PHYSICS UI DATA INTEGRATION              ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const papers = getPredictedPapers();

console.log(`📊 Total Papers in System: ${papers.length}\n`);

// Find KCET Physics papers
const kcetPhysicsA = papers.find(p => p.id === 'physics-a');
const kcetPhysicsB = papers.find(p => p.id === 'physics-b');

// Find NEET Physics papers
const neetPhysicsA = papers.find(p => p.id === 'neet-physics-a');
const neetPhysicsB = papers.find(p => p.id === 'neet-physics-b');

console.log('🎯 KCET PHYSICS PAPERS:');
console.log(`   physics-a: ${kcetPhysicsA ? `✅ FOUND - ${kcetPhysicsA.questions.length} questions, ${kcetPhysicsA.examContext}` : '❌ NOT FOUND'}`);
console.log(`   physics-b: ${kcetPhysicsB ? `✅ FOUND - ${kcetPhysicsB.questions.length} questions, ${kcetPhysicsB.examContext}` : '❌ NOT FOUND'}`);
console.log('');

console.log('🎯 NEET PHYSICS PAPERS:');
console.log(`   neet-physics-a: ${neetPhysicsA ? `✅ FOUND - ${neetPhysicsA.questions.length} questions, ${neetPhysicsA.examContext}` : '❌ NOT FOUND'}`);
console.log(`   neet-physics-b: ${neetPhysicsB ? `✅ FOUND - ${neetPhysicsB.questions.length} questions, ${neetPhysicsB.examContext}` : '❌ NOT FOUND'}`);
console.log('');

if (neetPhysicsA) {
    console.log('📋 NEET PHYSICS SET A Details:');
    console.log(`   ID: ${neetPhysicsA.id}`);
    console.log(`   Title: ${neetPhysicsA.title}`);
    console.log(`   Subject: ${neetPhysicsA.subject}`);
    console.log(`   Set: ${neetPhysicsA.setName}`);
    console.log(`   Exam Context: ${neetPhysicsA.examContext}`);
    console.log(`   Questions: ${neetPhysicsA.questions.length}`);
    console.log('');
}

if (neetPhysicsB) {
    console.log('📋 NEET PHYSICS SET B Details:');
    console.log(`   ID: ${neetPhysicsB.id}`);
    console.log(`   Title: ${neetPhysicsB.title}`);
    console.log(`   Subject: ${neetPhysicsB.subject}`);
    console.log(`   Set: ${neetPhysicsB.setName}`);
    console.log(`   Exam Context: ${neetPhysicsB.examContext}`);
    console.log(`   Questions: ${neetPhysicsB.questions.length}`);
    console.log('');
}

// List all paper IDs
console.log('📝 All Paper IDs in System:');
papers.forEach(p => {
    const examBadge = p.examContext ? `[${p.examContext}]` : '';
    console.log(`   ${p.id.padEnd(20)} ${examBadge.padEnd(8)} ${p.questions.length} questions - ${p.title}`);
});

console.log('\n✅ Verification Complete\n');

if (neetPhysicsA && neetPhysicsA.questions.length === 45) {
    console.log('🎉 SUCCESS: NEET Physics SET A has correct 45 questions');
} else {
    console.log(`⚠️  WARNING: NEET Physics SET A has ${neetPhysicsA?.questions.length || 0} questions (expected 45)`);
}

if (neetPhysicsB && neetPhysicsB.questions.length === 45) {
    console.log('🎉 SUCCESS: NEET Physics SET B has correct 45 questions');
} else {
    console.log(`⚠️  WARNING: NEET Physics SET B has ${neetPhysicsB?.questions.length || 0} questions (expected 45)`);
}

console.log('');
