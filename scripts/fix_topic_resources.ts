import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function checkTopicResources() {
    const { data: resources, error } = await supabaseAdmin
        .from('topic_resources')
        .select('id, subject, topic_name, exam_context, user_id');

    if (error) {
        console.error('Error fetching topic_resources:', error);
        return;
    }

    const bioResources = resources.filter(r => r.subject === 'Biology' || r.subject === 'Botany' || r.subject === 'Zoology');
    console.log(`📊 Found ${bioResources.length} Total Bio-descendant resources in topic_resources.`);

    const status = {};
    bioResources.forEach(r => {
        const key = `${r.subject} (${r.exam_context || 'No Context'})`;
        status[key] = (status[key] || 0) + 1;
    });
    console.log('\nSubject/Exam Context Breakdown:', status);

    const biologyResources = bioResources.filter(r => r.subject === 'Biology');
    if (biologyResources.length > 0) {
        console.log(`\n⚠️  Found ${biologyResources.length} "Biology" resources!`);

        // Check if we can fix them
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

        let updated = 0;
        for (const r of biologyResources) {
            let newSubject = 'Biology';
            if (BOTANY_TOPIC_NAMES.includes(r.topic_name)) newSubject = 'Botany';
            else if (ZOOLOGY_TOPIC_NAMES.includes(r.topic_name)) newSubject = 'Zoology';

            if (newSubject !== 'Biology') {
                const { error: updErr } = await supabaseAdmin
                    .from('topic_resources')
                    .update({ subject: newSubject })
                    .eq('id', r.id);
                if (!updErr) updated++;
            } else {
                console.log(`  - Unmapped: "${r.topic_name}"`);
            }
        }
        console.log(`✅ Updated ${updated} resources to Botany/Zoology.`);
    }

    // Double check if any are STILL biology
    const { data: finalResources } = await supabaseAdmin
        .from('topic_resources')
        .select('subject, topic_name')
        .eq('subject', 'Biology');

    console.log(`\nRemaining Biology resources: ${finalResources?.length || 0}`);
}

checkTopicResources();
