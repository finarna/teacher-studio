import { getForecastedCalibration } from '../../lib/reiEvolutionEngine.ts';
import dotenv from 'dotenv';
dotenv.config();

/**
 * REI NEURAL AUDIT: NEET 2026 CALCULATED FORECAST
 */
async function audit() {
    console.log('🧠 [REI v16.0] INITIATING NEURAL AUDIT FOR NEET...');
    const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    
    for (const s of subjects) {
        try {
            const f = await getForecastedCalibration('NEET', s);
            console.log(`\n🎯 NEET ${s} 2026 REI FORECAST:`);
            console.log(`   - Difficulty Mix: E:${f.difficultyProfile.easy}% M:${f.difficultyProfile.moderate}% H:${f.difficultyProfile.hard}%`);
            console.log(`   - IDS Target: ${f.idsTarget}`);
            console.log(`   - Rigor Velocity: ${f.rigorVelocity}x`);
            console.log(`   - Directives: ${f.directives[0] || 'None'}`);
        } catch (e) {
            console.error(`❌ Audit failed for ${s}:`, e.message);
        }
    }
    process.exit(0);
}

audit();
