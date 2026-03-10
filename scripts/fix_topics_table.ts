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

async function fixTopicsTable() {
    console.log('🔍 Fetching topics with subject "Biology"...');
    const { data: topics, error } = await supabaseAdmin
        .from('topics')
        .select('id, name, subject')
        .eq('subject', 'Biology');

    if (error) {
        console.error('Error fetching topics:', error);
        return;
    }

    console.log(`📊 Found ${topics.length} "Biology" topics.`);

    let updated = 0;
    for (const t of topics) {
        let newSubject = 'Biology';
        if (BOTANY_TOPIC_NAMES.includes(t.name)) newSubject = 'Botany';
        else if (ZOOLOGY_TOPIC_NAMES.includes(t.name)) newSubject = 'Zoology';

        if (newSubject !== 'Biology') {
            const { error: updErr } = await supabaseAdmin
                .from('topics')
                .update({ subject: newSubject })
                .eq('id', t.id);

            if (updErr) {
                console.error(`❌ Failed to update topic ${t.name}:`, updErr.message);
            } else {
                updated++;
                console.log(`✅ Updated topic: ${t.name} -> ${newSubject}`);
            }
        } else {
            console.log(`⚠️  Topic still Biology (unmapped): "${t.name}"`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully updated ${updated} topics in "topics" table.`);
    console.log('='.repeat(60));
}

fixTopicsTable();
