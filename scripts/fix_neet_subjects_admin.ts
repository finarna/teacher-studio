import { supabaseAdmin } from '../lib/supabaseServer.ts';

const BOTANY_TOPIC_NAMES = [
    'The Living World', 'Biological Classification', 'Plant Kingdom', 'Morphology of Flowering Plants',
    'Anatomy of Flowering Plants', 'Cell: The Unit of Life', 'Biomolecules', 'Cell Cycle and Cell Division',
    'Transport in Plants', 'Mineral Nutrition', 'Photosynthesis in Higher Plants', 'Respiration in Plants',
    'Plant Growth and Development', 'Sexual Reproduction in Flowering Plants', 'Principles of Inheritance and Variation',
    'Molecular Basis of Inheritance', 'Biotechnology Principles and Processes', 'Biotechnology: Principles and Processes',
    'Biotechnology and its Applications', 'Biotechnology: and its Applications',
    'Organisms and Populations', 'Ecosystem', 'Biodiversity and Conservation', 'Environmental Issues', 'Microbes in Human Welfare'
];

const ZOOLOGY_TOPIC_NAMES = [
    'Animal Kingdom', 'Structural Organisation in Animals', 'Digestion and Absorption', 'Breathing and Exchange of Gases',
    'Body Fluids and Circulation', 'Excretory Products and Their Elimination', 'Locomotion and Movement',
    'Neural Control and Coordination', 'Chemical Coordination and Integration', 'Human Reproduction',
    'Reproductive Health', 'Evolution', 'Human Health and Disease'
];

async function fixNeetQuestions() {
    console.log('🔍 Fetching NEET questions using supabaseAdmin...');

    const { data: questions, error } = await supabaseAdmin
        .from('questions')
        .select('id, subject, topic, scan_id')
        .eq('exam_context', 'NEET');

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    console.log(`📊 Found ${questions.length} NEET questions.`);

    let botanyCount = 0;
    let zoologyCount = 0;
    let unmappedCount = 0;
    let updatedCount = 0;

    for (const q of questions) {
        let newSubject = q.subject;
        const topic = q.topic || '';

        if (BOTANY_TOPIC_NAMES.includes(topic)) {
            newSubject = 'Botany';
        } else if (ZOOLOGY_TOPIC_NAMES.includes(topic)) {
            newSubject = 'Zoology';
        }

        if (newSubject !== q.subject) {
            const { error: updateError } = await supabaseAdmin
                .from('questions')
                .update({ subject: newSubject })
                .eq('id', q.id);

            if (updateError) {
                console.error(`❌ Failed to update Q ${q.id}:`, updateError.message);
            } else {
                updatedCount++;
            }
        }

        if (newSubject === 'Botany') botanyCount++;
        if (newSubject === 'Zoology') zoologyCount++;
        if (newSubject === 'Biology') {
            unmappedCount++;
            console.log(`⚠️  Question still "Biology": ID ${q.id}, Topic: "${topic}"`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Final NEET Question Distribution:');
    console.log(`  - Botany: ${botanyCount}`);
    console.log(`  - Zoology: ${zoologyCount}`);
    console.log(`  - Still Biology/Unmapped: ${unmappedCount}`);
    console.log(`✅ Total updated: ${updatedCount}`);
    console.log('='.repeat(60));
}

fixNeetQuestions();
