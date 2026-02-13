import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStructure() {
  console.log('🔍 VERIFYING DOMAIN/TOPIC STRUCTURE\n');
  console.log('=' .repeat(60));

  // Get latest Math scan with questions
  const { data: scans, error: scanError } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, status, created_at, analysis_data')
    .eq('subject', 'Math')
    .eq('status', 'Complete')
    .order('created_at', { ascending: false })
    .limit(5);

  if (scanError) {
    console.error('Error fetching scans:', scanError.message);
    return;
  }

  if (!scans || scans.length === 0) {
    console.log('❌ No Math scans found');
    return;
  }

  // Find first scan with questions
  const scan = scans.find(s => s.analysis_data?.questions?.length > 0);

  if (!scan) {
    console.log('❌ No Math scans with questions found');
    console.log('\nAvailable scans:');
    scans.forEach(s => {
      const qCount = s.analysis_data?.questions?.length || 0;
      console.log(`  - ${s.name}: ${qCount} questions`);
    });
    return;
  }

  const questions = scan.analysis_data?.questions || [];

  console.log(`\n📄 SCAN: ${scan.name}`);
  console.log(`   Status: ${scan.status}`);
  console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);
  console.log(`   Total Questions: ${questions.length}`);
  console.log('\n' + '='.repeat(60));

  if (questions.length === 0) {
    console.log('❌ No questions found in analysis_data');
    return;
  }

  // Analyze structure
  const domainMap = new Map();
  const topicMap = new Map();
  let missingDomain = 0;
  let missingTopic = 0;

  questions.forEach(q => {
    const domain = q.domain || 'NO_DOMAIN';
    const topic = q.topic || 'NO_TOPIC';

    if (!q.domain) missingDomain++;
    if (!q.topic) missingTopic++;

    // Count questions per domain
    if (!domainMap.has(domain)) {
      domainMap.set(domain, { count: 0, topics: new Set() });
    }
    const domainData = domainMap.get(domain);
    domainData.count++;
    domainData.topics.add(topic);

    // Count questions per topic
    topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
  });

  // Display Domain → Topic hierarchy
  console.log('\n📊 DOMAIN → TOPIC HIERARCHY:\n');

  const sortedDomains = Array.from(domainMap.entries())
    .sort((a, b) => b[1].count - a[1].count);

  sortedDomains.forEach(([domain, data]) => {
    console.log(`\n🔷 ${domain} (${data.count} questions)`);
    const topics = Array.from(data.topics).sort();
    topics.forEach(topic => {
      const topicCount = topicMap.get(topic);
      console.log(`   └─ ${topic}: ${topicCount} questions`);
    });
  });

  // Statistics
  console.log('\n' + '='.repeat(60));
  console.log('\n📈 STATISTICS:\n');
  console.log(`   Total Questions: ${questions.length}`);
  console.log(`   Unique Domains: ${domainMap.size}`);
  console.log(`   Unique Topics: ${topicMap.size}`);
  console.log(`   Missing Domain: ${missingDomain} questions`);
  console.log(`   Missing Topic: ${missingTopic} questions`);

  // Sample questions
  console.log('\n' + '='.repeat(60));
  console.log('\n📝 SAMPLE QUESTIONS (First 5):\n');

  questions.slice(0, 5).forEach((q, idx) => {
    console.log(`Q${idx + 1}:`);
    console.log(`   Domain: "${q.domain || 'MISSING'}"`);
    console.log(`   Topic: "${q.topic || 'MISSING'}"`);
    console.log(`   Difficulty: ${q.difficulty || 'N/A'}`);
    console.log(`   Marks: ${q.marks || 'N/A'}`);
    const text = q.text ? q.text.substring(0, 60) + '...' : 'No text';
    console.log(`   Text: ${text}`);
    console.log('');
  });

  // Check Learning Journey integration
  console.log('='.repeat(60));
  console.log('\n🔗 LEARNING JOURNEY INTEGRATION:\n');

  const uniqueTopics = Array.from(topicMap.keys())
    .filter(t => t !== 'NO_TOPIC')
    .slice(0, 10);

  console.log('Checking if topics exist in official topics table...\n');

  for (const topic of uniqueTopics) {
    const { data: officialTopic, error: topicError } = await supabase
      .from('topics')
      .select('id, name, subject, domain')
      .eq('name', topic)
      .eq('subject', 'Math')
      .maybeSingle();

    if (officialTopic) {
      console.log(`   ✅ "${topic}"`);
      console.log(`      → Official Domain: "${officialTopic.domain || 'N/A'}"`);
    } else {
      console.log(`   ❌ "${topic}" → NOT in topics table`);
      console.log(`      (Questions with this topic will not show in Learning Journey)`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ VERIFICATION COMPLETE\n');
}

verifyStructure().catch(console.error);
