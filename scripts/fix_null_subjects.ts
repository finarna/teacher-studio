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

async function fixNullSubjects() {
    console.log('🔍 Fetching all NEET questions...');
    const { data: questions, error } = await supabaseAdmin
        .from('questions')
        .select('id, subject, topic, exam_context')
        .eq('exam_context', 'NEET');

    if (error) {
        console.error('Error fetching questions:', error);
        return;
    }

    console.log(`📊 Auditing ${questions.length} NEET questions.`);

    let updated = 0;
    for (const q of questions) {
        let newSubject = q.subject;
        const topic = q.topic || '';

        // Check if it's Physics or Chemistry by topic (simplified list)
        if (topic.includes('d and f Block') || topic.includes('Electrochemistry') || topic.includes('Isolation of Elements')) {
            if (!q.subject) newSubject = 'Chemistry';
        }
        // ... we don't need a full list, just handle the Bio ones for now

        if (BOTANY_TOPIC_NAMES.includes(topic)) {
            newSubject = 'Botany';
        } else if (ZOOLOGY_TOPIC_NAMES.includes(topic)) {
            newSubject = 'Zoology';
        }

        if (newSubject && newSubject !== q.subject) {
            const { error: updErr } = await supabaseAdmin
                .from('questions')
                .update({ subject: newSubject })
                .eq('id', q.id);
            if (!updErr) {
                updated++;
            }
        }
    }

    console.log(`✅ Updated ${updated} NEET questions (including those with null subject).`);
}

fixNullSubjects();
