
import fs from 'fs';

const realMathText = fs.readFileSync('./REAL_2026_TEXT_CHEMISTRY.txt', 'utf-8');
const setA = JSON.parse(fs.readFileSync('./flagship_final.json', 'utf-8'));
const setB = JSON.parse(fs.readFileSync('./flagship_final_b.json', 'utf-8'));

const predictedQuestions = [...setA.test_config.questions, ...setB.test_config.questions];

const topics = {};
predictedQuestions.forEach(q => {
    topics[q.topic] = (topics[q.topic] || 0) + 1;
});

console.log("Predicted Topic Distribution:", topics);

// Simple keyword matching for "Identity Hits"
const keywords = [
    "reflexive", "onto", "surjective", "adjoint", "determinant", "skew-symmetric",
    "increasing", "decreasing", "maxima", "minima", "integral", "greatest integer",
    "probability", "vector", "orthogonal", "projection", "limit", "continuous"
];

const matches = [];
keywords.forEach(kw => {
    const inReal = realMathText.toLowerCase().includes(kw.toLowerCase());
    const inPred = predictedQuestions.some(q => q.text.toLowerCase().includes(kw.toLowerCase()));
    if (inReal && inPred) {
        matches.push(kw);
    }
});

console.log("Common Keywords (Potential Hits):", matches);
