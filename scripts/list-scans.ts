import { supabaseAdmin } from '../lib/supabaseServer.ts';

async function listAllScans() {
  console.log('🔍 Listing all scans...');
  const { data: scans } = await supabaseAdmin
    .from('scans')
    .select('id, name, subject, exam_context, status, is_system_scan, user_id')
    .order('created_at', { ascending: false })
    .limit(10);

  scans?.forEach(sc => {
    console.log(`- ${sc.id} | ${sc.name} | ${sc.subject} | ${sc.exam_context} | ${sc.status} | System: ${sc.is_system_scan} | User: ${sc.user_id}`);
  });
}

listAllScans().catch(console.error);
