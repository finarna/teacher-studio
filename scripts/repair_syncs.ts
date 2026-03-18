import { supabaseAdmin } from './lib/supabaseServer.ts';
import { syncScanToAITables } from './lib/syncScanToAITables.ts';

async function repairAllSyncs() {
    console.log('🚀 Repairing all Scan -> AI Table synchronizations...');

    const { data: scans } = await supabaseAdmin
        .from('scans')
        .select('id, name, year, exam_context, subject')
        .not('year', 'is', null)
        .not('analysis_data', 'is', null);

    console.log(`Found ${scans?.length || 0} valid scans to re-sync.`);

    for (const scan of scans || []) {
        console.log(`\n🔄 Syncing: ${scan.name} (${scan.year} ${scan.exam_context} ${scan.subject})`);
        const result = await syncScanToAITables(supabaseAdmin, scan.id);
        if (result.success) {
            console.log(`✅ Success: Updated ${result.distributionsUpdated} topics.`);
        } else {
            console.log(`❌ Failed: ${result.message}`);
        }
    }

    console.log('\n✨ Repair complete. Historical trends should now show 60 items for each paper.');
}

repairAllSyncs();
