
import fs from 'fs';

const mathJsonPath = './REAL_2026_KCET/extracted_real_papers/real_math_2026.json';
const mathData = JSON.parse(fs.readFileSync(mathJsonPath, 'utf-8'));

const identityMapping = {
    1: "MAT-015", 2: "MAT-029", 3: "MAT-029", 4: "MAT-014", 5: "MAT-014",
    6: "MAT-025", 7: "MAT-030", 8: "MAT-003", 9: "MAT-009", 10: "MAT-006",
    11: "MAT-007", 12: "MAT-007", 13: "MAT-012", 14: "MAT-009", 15: "MAT-016",
    16: "MAT-016", 17: "MAT-016", 18: "MAT-016", 19: "MAT-017", 20: "MAT-017",
    21: "MAT-017", 22: "MAT-017", 23: "MAT-016", 24: "MAT-026", 25: "MAT-026",
    26: "MAT-026", 27: "MAT-027", 28: "MAT-027", 29: "MAT-010", 30: "MAT-011",
    31: "MAT-027", 32: "MAT-012", 33: "MAT-012", 34: "MAT-019", 35: "MAT-018",
    36: "MAT-019", 37: "MAT-019", 38: "MAT-019", 39: "MAT-021", 40: "MAT-021",
    41: "MAT-022", 42: "MAT-023", 43: "MAT-023", 44: "MAT-022", 45: "MAT-022",
    46: "MAT-024", 47: "MAT-024", 48: "MAT-025", 49: "MAT-001", 50: "MAT-001",
    51: "MAT-002", 52: "MAT-002", 53: "MAT-014", 54: "MAT-003", 55: "MAT-009",
    56: "MAT-013", 57: "MAT-014", 58: "MAT-002", 59: "MAT-002", 60: "MAT-015"
};

mathData.questions.forEach(q => {
    const id = identityMapping[q.questionNumber];
    if (id) {
        q.identityId = id;
    }
});

fs.writeFileSync(mathJsonPath, JSON.stringify(mathData, null, 2));
console.log("✓ Math paper injected with Oracle Identity IDs.");
