import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// Use ANON key like the frontend does
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const targetScanId = '6f10ca9c-8431-466c-becf-1dc8ec8f6446';

async function debug() {
  // Simulate loadScans: get completed scans limit 100
  const { data: scanData } = await supabase
    .from('scans')
    .select('id, name, status, questions:questions(count)')
    .order('created_at', { ascending: false })
    .limit(100);

  const completedScans = (scanData || []).filter((s: any) =>
    s.status?.toLowerCase() === 'complete' || s.status?.toLowerCase() === 'completed'
  );
  const scanIds = completedScans.map((s: any) => s.id);
  console.log('Completed scans:', completedScans.length);

  // Questions query with limit
  const { data: allQuestionsData } = await supabase
    .from('questions')
    .select('id, scan_id')
    .in('scan_id', scanIds)
    .limit(10000);

  console.log('Questions fetched:', allQuestionsData?.length);
  const targetQs = allQuestionsData?.filter((q: any) => q.scan_id === targetScanId);
  console.log('KCET Bio 2025 questions in result:', targetQs?.length);

  const allQIds = (allQuestionsData || []).map((q: any) => q.id);

  // Mappings query
  const { data: mappingsData } = await supabase
    .from('topic_question_mapping')
    .select('question_id')
    .in('question_id', allQIds)
    .limit(10000);

  console.log('Mappings fetched:', mappingsData?.length);

  const targetQIds = targetQs?.map((q: any) => q.id) || [];
  const mappedSet = new Set(mappingsData?.map((m: any) => m.question_id));
  const mappedForTarget = targetQIds.filter(id => mappedSet.has(id));
  console.log('KCET Bio 2025 mapped count:', mappedForTarget.length);
  console.log('KCET Bio 2025 unmapped count:', targetQIds.length - mappedForTarget.length);

  // Also check the question count from the scan's nested count
  const targetScan = completedScans.find((s: any) => s.id === targetScanId);
  console.log('Scan question count (from count):', (targetScan as any)?.questions?.[0]?.count);
}

debug().catch(console.error);
