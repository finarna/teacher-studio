
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * REI v3.0 Core Restoration Script
 * This script seeds the ESSENTIAL configurations and metadata.
 * It NO LONGER seeds synthetic historical patterns, as the system now uses
 * a "Universal Anchor" to kickstart evolution from the first real scan.
 */
async function restoreFullREI() {
    console.log('🚀 [REI v3.0] RESTORING CORE SYSTEM INTELLIGENCE');
    console.log('==============================================\n');

    // 1. Restore Exam Configurations (Deterministic Question Counts)
    console.log('📊 Step 1: Seeding Official Exam Configurations...');
    const examConfigs = [
        // KCET (60 Questions per subject)
        { exam_context: 'KCET', subject: 'Math', total_questions: 60, duration_minutes: 80, marks_per_question: 1, passing_percentage: 33, negative_marking_enabled: false },
        { exam_context: 'KCET', subject: 'Physics', total_questions: 60, duration_minutes: 80, marks_per_question: 1, passing_percentage: 33, negative_marking_enabled: false },
        { exam_context: 'KCET', subject: 'Chemistry', total_questions: 60, duration_minutes: 80, marks_per_question: 1, passing_percentage: 33, negative_marking_enabled: false },
        { exam_context: 'KCET', subject: 'Biology', total_questions: 60, duration_minutes: 80, marks_per_question: 1, passing_percentage: 33, negative_marking_enabled: false },

        // NEET (50 per subject: Section A=35 compulsory + Section B=15, attempt any 10)
        { exam_context: 'NEET', subject: 'Biology', total_questions: 100, duration_minutes: 200, marks_per_question: 4, passing_percentage: 50, negative_marking_enabled: true, negative_marking_deduction: -1 },
        { exam_context: 'NEET', subject: 'Physics', total_questions: 50, duration_minutes: 200, marks_per_question: 4, passing_percentage: 50, negative_marking_enabled: true, negative_marking_deduction: -1 },
        { exam_context: 'NEET', subject: 'Chemistry', total_questions: 50, duration_minutes: 200, marks_per_question: 4, passing_percentage: 50, negative_marking_enabled: true, negative_marking_deduction: -1 },
        { exam_context: 'NEET', subject: 'Botany', total_questions: 50, duration_minutes: 200, marks_per_question: 4, passing_percentage: 50, negative_marking_enabled: true, negative_marking_deduction: -1 },
        { exam_context: 'NEET', subject: 'Zoology', total_questions: 50, duration_minutes: 200, marks_per_question: 4, passing_percentage: 50, negative_marking_enabled: true, negative_marking_deduction: -1 },

        // JEE (30 Questions per subject)
        { exam_context: 'JEE', subject: 'Math', total_questions: 30, duration_minutes: 180, marks_per_question: 4, passing_percentage: 33, negative_marking_enabled: true, negative_marking_deduction: -1 },
        { exam_context: 'JEE', subject: 'Physics', total_questions: 30, duration_minutes: 180, marks_per_question: 4, passing_percentage: 33, negative_marking_enabled: true, negative_marking_deduction: -1 },
        { exam_context: 'JEE', subject: 'Chemistry', total_questions: 30, duration_minutes: 180, marks_per_question: 4, passing_percentage: 33, negative_marking_enabled: true, negative_marking_deduction: -1 },

        // CBSE (Approx 40-50 Questions)
        { exam_context: 'CBSE', subject: 'Math', total_questions: 38, duration_minutes: 180, marks_per_question: null, passing_percentage: 33, negative_marking_enabled: false },
        { exam_context: 'CBSE', subject: 'Physics', total_questions: 35, duration_minutes: 180, marks_per_question: null, passing_percentage: 33, negative_marking_enabled: false },
        { exam_context: 'CBSE', subject: 'Chemistry', total_questions: 35, duration_minutes: 180, marks_per_question: null, passing_percentage: 33, negative_marking_enabled: false },
        { exam_context: 'CBSE', subject: 'Biology', total_questions: 33, duration_minutes: 180, marks_per_question: null, passing_percentage: 33, negative_marking_enabled: false }
    ];

    for (const config of examConfigs) {
        const { error } = await supabase.from('exam_configurations').upsert(config, { onConflict: 'exam_context,subject' });
        if (error) console.error(`  ❌ Failed for ${config.exam_context} ${config.subject}: ${error.message}`);
        else console.log(`  ✅ Configured ${config.exam_context} ${config.subject} -> ${config.total_questions} questions`);
    }

    // 2. Restore Topic Metadata (Crucial for AI mapping)
    console.log('\n📚 Step 2: Seeding Official 2026 Topic Metadata...');

    const allTopics: any[] = [];
    const contexts: any[] = ['KCET', 'NEET', 'JEE', 'CBSE'];

    // Physics Topics mapping
    const physicsNames = [
        'Electric Charges and Fields', 'Electrostatic Potential and Capacitance', 'Current Electricity',
        'Moving Charges and Magnetism', 'Magnetism and Matter', 'Electromagnetic Induction',
        'Alternating Current', 'Electromagnetic Waves', 'Ray Optics and Optical Instruments',
        'Wave Optics', 'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei', 'Semiconductor Electronics'
    ];

    // Chemistry Topics mapping
    // NEET 2026: Surface Chemistry, General Principles of Isolation, Chemistry in Everyday Life REMOVED
    const chemistryNames = [
        'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'p-Block Elements',
        'd and f Block Elements', 'Coordination Compounds', 'Haloalkanes and Haloarenes',
        'Alcohols Phenols and Ethers', 'Aldehydes Ketones and Carboxylic Acids', 'Amines',
        'Biomolecules', 'Purification and Characterisation of Organic Compounds'
    ];

    // Biology Topics mapping
    const biologyNames = [
        'Sexual Reproduction in Flowering Plants', 'Principles of Inheritance and Variation',
        'Molecular Basis of Inheritance', 'Biotechnology Principles and Processes',
        'Biotechnology and its Applications', 'Organisms and Populations', 'Ecosystem',
        'Biodiversity and Conservation', 'Human Reproduction', 'Reproductive Health',
        'Human Health and Disease', 'Microbes in Human Welfare', 'Evolution'
    ];

    // Botany Topics (NEET split - Class 11 + 12 plant biology)
    // NEET 2026: Transport in Plants, Mineral Nutrition, Environmental Issues REMOVED
    const botanyNames = [
        'The Living World', 'Biological Classification', 'Plant Kingdom',
        'Morphology of Flowering Plants', 'Anatomy of Flowering Plants',
        'Cell: The Unit of Life', 'Biomolecules', 'Cell Cycle and Cell Division',
        'Photosynthesis in Higher Plants', 'Respiration in Plants', 'Plant Growth and Development',
        'Sexual Reproduction in Flowering Plants', 'Principles of Inheritance and Variation',
        'Molecular Basis of Inheritance', 'Biotechnology Principles and Processes',
        'Biotechnology and its Applications', 'Organisms and Populations',
        'Ecosystem', 'Biodiversity and Conservation', 'Microbes in Human Welfare'
    ];

    // Zoology Topics (NEET split - Class 11 + 12 animal biology)
    // NEET 2026: Digestion and Absorption REMOVED
    const zoologyNames = [
        'Animal Kingdom', 'Structural Organisation in Animals',
        'Breathing and Exchange of Gases', 'Body Fluids and Circulation',
        'Excretory Products and Their Elimination', 'Locomotion and Movement',
        'Neural Control and Coordination', 'Chemical Coordination and Integration',
        'Human Reproduction', 'Reproductive Health', 'Human Health and Disease', 'Evolution'
    ];

    // Math Topics mapping
    const mathNames = [
        'Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices', 'Determinants',
        'Continuity and Differentiability', 'Applications of Derivatives', 'Integrals',
        'Applications of Integrals', 'Differential Equations', 'Vectors',
        'Three Dimensional Geometry', 'Linear Programming', 'Probability'
    ];

    // Helper to generate IDs from names and push to allTopics
    const addMetadata = (names: string[], subject: string) => {
        for (const name of names) {
            for (const context of contexts) {
                // Determine difficulty based on name if possible, or default
                let difficulty = 5;
                if (['Integrals', 'Moving Charges and Magnetism', 'Molecular Basis of Inheritance'].includes(name)) difficulty = 8;
                if (['Probability', 'Continuity and Differentiability', 'Alternating Current'].includes(name)) difficulty = 7;

                allTopics.push({
                    topic_id: `${name.toLowerCase().replace(/ /g, '_')}_${context.toLowerCase()}_${subject.toLowerCase()}`.substring(0, 50),
                    topic_name: name,
                    subject,
                    exam_context: context,
                    estimated_difficulty: difficulty
                });
            }
        }
    };

    addMetadata(physicsNames, 'Physics');
    addMetadata(chemistryNames, 'Chemistry');
    addMetadata(biologyNames, 'Biology');
    addMetadata(mathNames, 'Math');

    // Botany and Zoology are NEET-only splits — seed only for NEET context
    const addMetadataForContext = (names: string[], subject: string, context: string) => {
        for (const name of names) {
            let difficulty = 5;
            if (['Molecular Basis of Inheritance', 'Neural Control and Coordination'].includes(name)) difficulty = 8;
            if (['Human Reproduction', 'Principles of Inheritance and Variation'].includes(name)) difficulty = 7;
            allTopics.push({
                topic_id: `${name.toLowerCase().replace(/ /g, '_')}_${context.toLowerCase()}_${subject.toLowerCase()}`.substring(0, 50),
                topic_name: name,
                subject,
                exam_context: context,
                estimated_difficulty: difficulty
            });
        }
    };
    addMetadataForContext(botanyNames, 'Botany', 'NEET');
    addMetadataForContext(zoologyNames, 'Zoology', 'NEET');

    // Deduplicate to avoid ON CONFLICT errors
    const uniqueTopics = Array.from(new Map(allTopics.map(item => [item.topic_id, item])).values());
    console.log(`  🔍 Preparing to sync ${uniqueTopics.length} unique topic metadata entries...`);

    // Upsert in chunks to handle large payload
    for (let i = 0; i < uniqueTopics.length; i += 100) {
        const chunk = uniqueTopics.slice(i, i + 100);
        const { error } = await supabase.from('topic_metadata').upsert(chunk, { onConflict: 'topic_id' });
        if (error) {
            console.error(`  ❌ Chunk failed: ${error.message}`);
        }
    }
    console.log(`  ✅ Synced all official topic metadata for KCET, NEET, JEE, and CBSE.`);

    // 3. Restore Generation Rules (Target Weights)
    console.log('\n⚙️  Step 3: Calibrating Generation Rules (AI Strategy)...');
    const genRules = [];

    for (const context of contexts) {
        const subjects = ['Math', 'Physics', 'Chemistry', 'Biology'];
        for (const subject of subjects) {
            // Skip certain subject combinations
            if (context === 'NEET' && subject === 'Math') continue;
            if (context === 'JEE' && subject === 'Biology') continue;

            genRules.push({
                exam_context: context,
                subject,
                weight_predicted_pattern: 0.5,
                weight_student_weak_areas: 0.25,
                weight_curriculum_balance: 0.15,
                weight_recent_trends: 0.1,
                strategy_mode: 'predictive_mock'
            });
        }
    }

    // Botany and Zoology — NEET-only split subjects
    for (const subject of ['Botany', 'Zoology']) {
        genRules.push({
            exam_context: 'NEET',
            subject,
            weight_predicted_pattern: 0.5,
            weight_student_weak_areas: 0.25,
            weight_curriculum_balance: 0.15,
            weight_recent_trends: 0.1,
            strategy_mode: 'predictive_mock'
        });
    }

    for (const rule of genRules) {
        const { error } = await supabase.from('generation_rules').upsert(rule, { onConflict: 'exam_context,subject' });
        if (error) console.error(`  ❌ Rule Failed for ${rule.exam_context} ${rule.subject}: ${error.message}`);
    }
    console.log(`  ✅ Calibrated weights for all Subjects across KCET, NEET, JEE, and CBSE.`);

    console.log('\n✨ [REI v3.0] CORE RESTORE COMPLETE');
    console.log('📡 The system is now using the "Universal Anchor" logic.');
    console.log('📊 Upload your first paper to start the evolution chain.');
    console.log('----------------------------------------------');
}

restoreFullREI()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Restore failed:', err);
        process.exit(1);
    });
