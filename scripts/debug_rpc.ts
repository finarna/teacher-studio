import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const targetScanId = '6f10ca9c-8431-466c-becf-1dc8ec8f6446';

async function debug() {
  const { data: scanData } = await supabase
    .from('scans').select('id, status').order('created_at', { ascending: false }).limit(100);

  const scanIds = (scanData || [])
    .filter((s: any) => s.status?.toLowerCase() === 'complete' || s.status?.toLowerCase() === 'completed')
    .map((s: any) => s.id);

  console.log('Scan IDs count:', scanIds.length);

  const { data, error } = await supabase.rpc('get_scan_mapping_counts', { p_scan_ids: scanIds });

  console.log('RPC error:', error?.message);
  console.log('RPC rows returned:', data?.length);

  const target = (data || []).find((r: any) => r.scan_id === targetScanId);
  console.log('KCET Bio 2025 mapped_count:', target?.mapped_count ?? 'NOT FOUND');
}

debug().catch(console.error);
