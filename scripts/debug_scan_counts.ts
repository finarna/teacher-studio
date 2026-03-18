import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  // Simulate what loadScans does: get completed scans, limit 100
  const { data: scanData } = await supabase
    .from('scans')
    .select('id, name, status')
    .order('created_at', { ascending: false })
    .limit(100);

  const completedScans = (scanData || []).filter(s =>
    s.status?.toLowerCase() === 'complete' || s.status?.toLowerCase() === 'completed'
  );
  const scanIds = completedScans.map(s => s.id);
  console.log('Completed scans:', completedScans.length);

  // Check how many questions are fetched
  const { data: qData, count: qCount } = await supabase
    .from('questions')
    .select('id, scan_id', { count: 'exact' })
    .in('scan_id', scanIds);

  console.log('Questions returned (no limit):', qData?.length, '/ total:', qCount);

  // Is KCET Bio 2025 in the fetched questions?
  const targetScanId = '6f10ca9c-8431-466c-becf-1dc8ec8f6446';
  const targetQs = qData?.filter(q => q.scan_id === targetScanId);
  console.log('KCET Bio 2025 questions in result:', targetQs?.length);
  console.log('KCET Bio scan position in list:', completedScans.findIndex(s => s.id === targetScanId));
}

debug().catch(console.error);
