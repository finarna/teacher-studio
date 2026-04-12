
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Question {
    difficulty: string;
    text: string;
    topic: string;
    masteryMaterial?: {
        aiReasoning?: string;
        keyConcepts?: any[];
    }
}

async function verifyPhysicsREI() {
    console.log("🔍 [REI v17.0] INITIALIZING FORENSIC AUDIT FOR PHYSICS FLAGSHIP...");

    const files = [
        { name: 'SET_A', path: 'flagship_physics_final.json' },
        { name: 'SET_B', path: 'flagship_physics_final_b.json' }
    ];

    let overallReport = `# 🔬 PHYSICS FLAGSHIP FORENSIC AUDIT REPORT\n\n`;
    overallReport += `**Audit Timestamp**: ${new Date().toISOString()}\n`;
    overallReport += `**Engine Version**: REI v17.0 (Recursive Calibration)\n\n`;

    for (const file of files) {
        const filePath = path.join(process.cwd(), file.path);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Missing ${file.name} source: ${file.path}`);
            continue;
        }

        const questions: Question[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const total = questions.length;

        const difficultyCounts = {
            Easy: questions.filter(q => q.difficulty === 'Easy').length,
            Moderate: questions.filter(q => q.difficulty === 'Moderate').length,
            Hard: questions.filter(q => q.difficulty === 'Hard').length
        };

        const diffPcts = {
            Easy: ((difficultyCounts.Easy / total) * 100).toFixed(1),
            Moderate: ((difficultyCounts.Moderate / total) * 100).toFixed(1),
            Hard: ((difficultyCounts.Hard / total) * 100).toFixed(1)
        };

        // Concept Hit Rate (CHR) - Check if questions have identity tags or specific reasoning
        const taggedQuestions = questions.filter(q => 
            q.masteryMaterial?.aiReasoning?.includes('ID-P-') || 
            q.text.includes('ID-P-') ||
            q.masteryMaterial?.keyConcepts?.some((c: any) => c.name?.includes('ID-P-'))
        );
        const chr = ((taggedQuestions.length / total) * 100).toFixed(1);

        console.log(`\n📊 [${file.name}] Verification Summary:`);
        console.log(`   - Total Questions: ${total}`);
        console.log(`   - Difficulty: E:${diffPcts.Easy}% | M:${diffPcts.Moderate}% | H:${diffPcts.Hard}%`);
        console.log(`   - CHR (Concept Hit Rate): ${chr}%`);

        overallReport += `## 📜 ${file.name} (${file.path})\n`;
        overallReport += `| Metric | Value | Status |\n`;
        overallReport += `| :--- | :--- | :--- |\n`;
        overallReport += `| **Total Qs** | ${total} | ${total === 60 ? '✅ PASS' : '⚠️ WARN'} |\n`;
        overallReport += `| **Easy %** | ${diffPcts.Easy}% | ${Math.abs(Number(diffPcts.Easy)-40) < 15 ? '✅' : '❌'} |\n`;
        overallReport += `| **Moderate %** | ${diffPcts.Moderate}% | ${Math.abs(Number(diffPcts.Moderate)-40) < 15 ? '✅' : '❌'} |\n`;
        overallReport += `| **Hard %** | ${diffPcts.Hard}% | ${Math.abs(Number(diffPcts.Hard)-20) < 10 ? '✅' : '❌'} |\n`;
        overallReport += `| **CHR (Identity Match)** | ${chr}% | ${Number(chr) > 70 ? '💎 ELITE' : '⚖️ STABLE'} |\n\n`;

        // Topic Drift Check
        const topics = [...new Set(questions.map(q => q.topic))];
        overallReport += `**Topic Coverage (${topics.length})**: ${topics.slice(0, 5).join(', ')}...\n\n`;
    }

    fs.writeFileSync('PHYSICS_FLAGSHIP_AUDIT.md', overallReport);
    console.log("\n✅ AUDIT COMPLETE. Report saved to: PHYSICS_FLAGSHIP_AUDIT.md");
}

verifyPhysicsREI().catch(console.error);
