import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function verifyPastYearQuery() {
    const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    const examContext = 'NEET';

    console.log(`🔍 Verifying PYQ Hub queries for ${examContext}...`);

    for (const subject of subjects) {
        // Reproduce the query from PastYearExamsPage.tsx
        const { data: scans, error } = await supabaseAdmin
            .from('scans')
            .select('id, name, subject, subjects, is_system_scan, year')
            .or(`subject.eq.${subject},subjects.cs.{${subject}}`)
            .eq('exam_context', examContext)
            .eq('is_system_scan', true)
            .not('year', 'is', null);

        if (error) {
            console.error(`❌ Error for ${subject}:`, error.message);
        } else {
            console.log(`✅ ${subject}: Found ${scans?.length || 0} scans.`);
            scans?.forEach(s => console.log(`   - ${s.name} (Year: ${s.year}, Subjects: ${JSON.stringify(s.subjects)})`));
        }
    }
}

verifyPastYearQuery();
