import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function fixScanAnalysisData() {
    const scanId = 'd22af736-65f4-4ee4-8f05-3d6ea8e1f407'; // 2023 NEET Combined
    const { data: scan } = await supabaseAdmin.from('scans').select('analysis_data').eq('id', scanId).single();

    if (!scan || !scan.analysis_data || !scan.analysis_data.questions) {
        console.log('No questions found in Scan 2023 analysis_data.');
        return;
    }

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
    const questions = scan.analysis_data.questions.map((q: any) => {
        if (q.subject === 'Biology' || q.subject === 'Combined') {
            if (BOTANY_TOPIC_NAMES.includes(q.topic)) {
                q.subject = 'Botany';
                updated++;
            } else if (ZOOLOGY_TOPIC_NAMES.includes(q.topic)) {
                q.subject = 'Zoology';
                updated++;
            }
        }
        return q;
    });

    if (updated > 0) {
        const { error } = await supabaseAdmin
            .from('scans')
            .update({ analysis_data: { ...scan.analysis_data, questions } })
            .eq('id', scanId);

        if (error) console.error('Error updating Scan 2023 analysis_data:', error.message);
        else console.log(`✅ Fixed ${updated} question subjects in Scan 2023 analysis_data blob.`);
    } else {
        console.log('No "Biology" questions found in Scan 2023 analysis_data blob.');
    }
}

fixScanAnalysisData();
