import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugKCETBio() {
  // Find KCET Biology 2025 published scans
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, subject, subjects, is_combined_paper, year, status, is_system_scan')
    .eq('exam_context', 'KCET')
    .eq('year', 2025)
    .eq('is_system_scan', true)
    .or('subject.eq.Biology,subjects.cs.{Biology}');

  console.log('KCET 2025 Biology published scans:', JSON.stringify(scans, null, 2));

  if (!scans || scans.length === 0) return;

  for (const scan of scans) {
    console.log(`\n=== Scan: ${scan.name} (${scan.id}) ===`);
    
    // Get all questions
    const { data: questions } = await supabase
      .from('questions')
      .select('id, topic, subject')
      .eq('scan_id', scan.id);
    
    console.log(`Total questions: ${questions?.length}`);
    
    // Get mapped question IDs
    const qIds = questions?.map(q => q.id) || [];
    const { data: mappings } = await supabase
      .from('topic_question_mapping')
      .select('question_id')
      .in('question_id', qIds);
    
    const mappedIds = new Set(mappings?.map(m => m.question_id));
    const unmapped = questions?.filter(q => !mappedIds.has(q.id)) || [];
    
    console.log(`Mapped: ${mappedIds.size}, Unmapped: ${unmapped.length}`);
    console.log('\nUnmapped question topics:');
    unmapped.forEach(q => console.log(`  subject="${q.subject}", topic="${q.topic}"`));
  }
}

debugKCETBio().catch(console.error);
