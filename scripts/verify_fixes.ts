
import { fixLatexErrors } from '../utils/simpleMathExtractor.ts';

const testCases = [
    {
        name: "Point bug check",
        input: "The marks obtained in the point (1, 2) is a point of intersection.",
        expected: "The marks obtained in the point (1, 2) is a point of intersection."
    },
    {
        name: "Integration check",
        input: "Find the value of int sin x dx.",
        expected: "Find the value of \\int \\sin x dx."
    },
    {
        name: "Embedded int in word",
        input: "The intersection of two lines.",
        expected: "The intersection of two lines."
    },
    {
        name: "Standalone Greek",
        input: "Value of theta is pi/2.",
        expected: "Value of \\theta is \\pi/2."
    },
    {
        name: "KaTeX math check",
        input: "R - {-1, 1}",
        expected: "R - {-1, 1}" // fixLatexErrors doesn't wrap, it only fixes missing backslashes.
    }
];

console.log('🧪 UNIT TEST: LaTeX Auto-Fix Logic');
console.log('='.repeat(40));

let failures = 0;
testCases.forEach(tc => {
    const actual = fixLatexErrors(tc.input);
    if (actual === tc.expected) {
        console.log(`✅ [PASS] ${tc.name}`);
    } else {
        console.log(`❌ [FAIL] ${tc.name}`);
        console.log(`   Input:    ${tc.input}`);
        console.log(`   Expected: ${tc.expected}`);
        console.log(`   Actual:   ${actual}`);
        failures++;
    }
});

console.log('='.repeat(40));
if (failures === 0) {
    console.log('🚀 ALL TESTS PASSED! The point bug is officially dead.');
} else {
    console.log(`🚨 ${failures} tests failed. Needs more investigation.`);
    process.exit(1);
}
