import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const targetScanId = '6f10ca9c-8431-466c-becf-1dc8ec8f6446';

async function debug() {
  const { data: scanData } = await supabase
    .from('scans')
    .select('id, status')
    .order('created_at', { ascending: false })
    .limit(100);

  const completedScans = (scanData || []).filter((s: any) =>
    s.status?.toLowerCase() === 'complete' || s.status?.toLowerCase() === 'completed'
  );
  const scanIds = completedScans.map((s: any) => s.id);
  console.log('Completed scans:', completedScans.length);

  const { data: allMappingsData, error } = await supabase
    .from('topic_question_mapping')
    .select('question_id, questions!inner(scan_id)')
    .in('questions.scan_id', scanIds)
    .limit(10000);

  console.log('Mappings returned:', allMappingsData?.length, 'error:', error?.message);

  const mappingsByScan: Record<string, number> = {};
  (allMappingsData || []).forEach((m: any) => {
    const sid = m.questions?.scan_id;
    if (sid) mappingsByScan[sid] = (mappingsByScan[sid] || 0) + 1;
  });

  console.log('KCET Bio 2025 mapped count:', mappingsByScan[targetScanId] || 0);
}

debug().catch(console.error);
