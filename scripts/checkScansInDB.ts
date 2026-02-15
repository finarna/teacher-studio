import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Connecting to:', supabaseUrl);
console.log('Service key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  // Check scans
  const { data: scans, error } = await supabase
    .from('scans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nFound ${scans?.length || 0} total scans:\n`);

  for (const scan of scans || []) {
    console.log(`ID: ${scan.id}`);
    console.log(`Paper: ${scan.paper_name}`);
    console.log(`Status: ${scan.status}`);
    console.log(`Published: ${scan.is_system_scan}`);
    console.log(`Subject: ${scan.subject}`);
    console.log(`Exam: ${scan.exam_context}`);
    console.log(`Created: ${scan.created_at}`);

    // Count questions
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scan.id);

    console.log(`Questions: ${count || 0}`);
    console.log('---');
  }
}

checkDatabase();
