
import fs from 'fs';

const mathJsonPath = './REAL_2026_KCET/extracted_real_papers/real_math_2026.json';
const mathData = JSON.parse(fs.readFileSync(mathJsonPath, 'utf-8'));

const topicKeywords = {
    "Inverse Trigonometric Functions": ["tan − 1", "sin - 1", "cos - 1", "tan - 1"],
    "Linear Programming": ["corner points", "feasible region", "linear programming", "LPP"],
    "Probability": ["probability", "dice", "man and his wife", "left handed", "mutually exclusive"],
    "Differential Equations": ["integrating factor", "differential equation", "order and degree"],
    "Matrices": ["matrix", "row matrix", "order of the matrix", "invertible matrix", "symmetric"],
    "Determinants": ["determinant", "area of the triangle"],
    "Vectors": ["vec", "orthogonal", "vector", "dot product", "cross product"],
    "Three Dimensional Geometry": ["angle between the lines", "direction ratios", "3D", "points form a right-angled triangle"],
    "Limits": ["limit", "lim x →"],
    "Continuity and Differentiability": ["continuous at x =", "derivative of", "d y d x"],
    "Applications of Derivatives": ["strictly increasing", "maximum value", "drone camera", "viral according to", "rate of change"],
    "Integrals": ["integral", "R x f ( x )", "R 2 - 2", "R b a"],
    "Applications of Integrals": ["area of the region", "area enclosed by"],
    "Sets": ["subset", "set A", "n ( A )"],
    "Relations and Functions": ["relation in the set", "domain of the function", "mapping", "reflection of the graph"],
    "Statistics": ["mean and standard deviation"]
};

mathData.questions.forEach(q => {
    const textAndOpts = (q.text + " " + q.options.join(" ")).toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(kw => textAndOpts.includes(kw.toLowerCase()))) {
            q.topic = topic;
            break;
        }
    }
    
    // Guess difficulty based on keywords
    if (textAndOpts.includes("mahakumbh") || textAndOpts.includes("youtube") || textAndOpts.includes("reflection")) {
        q.difficulty = "Hard";
    } else if (textAndOpts.includes("definition") || textAndOpts.includes("row matrix") || textAndOpts.includes("formula")) {
        q.difficulty = "Easy";
    } else {
        q.difficulty = "Moderate";
    }
    
    // Default Blooms
    q.blooms = q.difficulty === "Easy" ? "Remember" : (q.difficulty === "Hard" ? "Analyze" : "Apply");
});

fs.writeFileSync(mathJsonPath, JSON.stringify(mathData, null, 2));
console.log("✓ Math paper auto-annotated with topics and difficulty.");
