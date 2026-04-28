import fs from 'fs';

const realData = JSON.parse(fs.readFileSync('REAL_2026_KCET/extracted_real_papers/real_math_2026.json', 'utf8'));
const setA = JSON.parse(fs.readFileSync('flagship_final.json', 'utf8')).test_config.questions;
const setB = JSON.parse(fs.readFileSync('flagship_final_b.json', 'utf8')).test_config.questions;

const matches = [];

realData.forEach((realQ, index) => {
    const realNum = index + 1;
    const realText = realQ.question;
    
    // Search Set A
    let bestMatchA = { score: 0, index: -1 };
    setA.forEach((q, idx) => {
        // Simple overlap check or keyword check
        const words = realText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        let count = 0;
        words.forEach(w => {
            if (q.text.toLowerCase().includes(w)) count++;
        });
        const score = count / words.length;
        if (score > bestMatchA.score) {
            bestMatchA = { score, index: idx + 1, text: q.text };
        }
    });

    // Search Set B
    let bestMatchB = { score: 0, index: -1 };
    setB.forEach((q, idx) => {
        const words = realText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        let count = 0;
        words.forEach(w => {
            if (q.text.toLowerCase().includes(w)) count++;
        });
        const score = count / words.length;
        if (score > bestMatchB.score) {
            bestMatchB = { score, index: idx + 1, text: q.text };
        }
    });

    matches.push({
        realNum,
        realText,
        bestA: bestMatchA,
        bestB: bestMatchB
    });
});

fs.writeFileSync('scratch/match_results.json', JSON.stringify(matches, null, 2));
console.log("Match analysis complete. Results saved to scratch/match_results.json");
