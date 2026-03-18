import { createClient } from '@supabase/supabase-js';

// Use SERVICE ROLE to simulate what admin sees (all scans visible)
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  // Get scans exactly like loadScans does
  const { data: scanData, error: scanErr } = await supabase
    .from('scans')
    .select('id, name, status, questions:questions(count)')
    .order('created_at', { ascending: false })
    .limit(100);

  console.log('scanErr:', scanErr?.message);

  const completedScans = (scanData || []).filter((s: any) =>
    s.status?.toLowerCase() === 'complete' || s.status?.toLowerCase() === 'completed'
  );
  const scanIds = completedScans.map((s: any) => s.id);
  console.log('Completed scans:', completedScans.length, 'scanIds count:', scanIds.length);

  // Call RPC exactly like the component does
  const { data: mappingCountsData, error: mappingError } = await supabase
    .rpc('get_scan_mapping_counts', { p_scan_ids: scanIds });

  console.log('RPC error:', mappingError?.message, mappingError?.code);
  console.log('RPC rows:', mappingCountsData?.length);

  if (mappingCountsData) {
    const sample = mappingCountsData.slice(0, 5);
    console.log('Sample rows:', JSON.stringify(sample));

    const bio2025 = mappingCountsData.find((r: any) => r.scan_id === '6f10ca9c-8431-466c-becf-1dc8ec8f6446');
    const bio2024 = completedScans.find((s: any) => s.name?.includes('2024') && s.name?.includes('Biology'));
    console.log('Bio 2025 row:', bio2025);
    console.log('Bio 2024 scan:', bio2024?.id, bio2024?.name);
    if (bio2024) {
      const bio2024mapped = mappingCountsData.find((r: any) => r.scan_id === bio2024.id);
      console.log('Bio 2024 row:', bio2024mapped);
    }
  }
}

debug().catch(console.error);
