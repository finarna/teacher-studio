import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function showScanStructure() {
  console.log('\n' + '='.repeat(70));
  console.log('📄 LATEST MATH SCAN - STRUCTURE ANALYSIS');
  console.log('='.repeat(70) + '\n');

  // Get latest Math scan with questions
  const { data: scans } = await supabase
    .from('scans')
    .select('id, name, subject, exam_context, status, created_at, analysis_data')
    .eq('subject', 'Math')
    .eq('status', 'Complete')
    .order('created_at', { ascending: false })
    .limit(5);

  const scan = scans?.find(s => s.analysis_data?.questions?.length > 0);

  if (!scan) {
    console.log('❌ No Math scans with questions found');
    return;
  }

  const questions = scan.analysis_data?.questions || [];

  console.log(`📋 SCAN INFO:`);
  console.log(`   Name: ${scan.name}`);
  console.log(`   Exam: ${scan.exam_context}`);
  console.log(`   Status: ${scan.status}`);
  console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);
  console.log(`   Total Questions: ${questions.length}`);
  console.log('\n' + '='.repeat(70));

  // Analyze the structure
  console.log('\n📊 EXTRACTED STRUCTURE:\n');

  // Group by domain → topics
  const domainMap = new Map();

  questions.forEach(q => {
    const domain = q.domain || 'NO_DOMAIN';
    const topic = q.topic || 'NO_TOPIC';

    if (!domainMap.has(domain)) {
      domainMap.set(domain, new Map());
    }

    const topicMap = domainMap.get(domain);
    topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
  });

  // Sort domains by question count
  const sortedDomains = Array.from(domainMap.entries())
    .sort((a, b) => {
      const countA = Array.from(a[1].values()).reduce((sum, count) => sum + count, 0);
      const countB = Array.from(b[1].values()).reduce((sum, count) => sum + count, 0);
      return countB - countA;
    });

  sortedDomains.forEach(([domain, topicMap]) => {
    const totalCount = Array.from(topicMap.values()).reduce((sum, count) => sum + count, 0);
    console.log(`\n🔷 ${domain} (${totalCount} questions)`);

    const sortedTopics = Array.from(topicMap.entries()).sort((a, b) => b[1] - a[1]);
    sortedTopics.forEach(([topic, count]) => {
      console.log(`   └─ ${topic}: ${count} questions`);
    });
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n📚 OFFICIAL SYLLABUS (from topics table):\n');

  // Get official topics
  const { data: officialTopics } = await supabase
    .from('topics')
    .select('id, name, domain, subject, exam_weightage')
    .eq('subject', 'Math')
    .order('domain, name');

  if (!officialTopics || officialTopics.length === 0) {
    console.log('❌ No official topics found in database');
    return;
  }

  // Group by domain
  const officialDomainMap = new Map();
  officialTopics.forEach(t => {
    if (!officialDomainMap.has(t.domain)) {
      officialDomainMap.set(t.domain, []);
    }
    officialDomainMap.get(t.domain).push(t);
  });

  const sortedOfficialDomains = Array.from(officialDomainMap.entries()).sort();

  sortedOfficialDomains.forEach(([domain, topics]) => {
    console.log(`\n🔷 ${domain} (${topics.length} topics)`);
    topics.forEach(t => {
      const weightage = t.exam_weightage?.[scan.exam_context] || 0;
      const relevantMark = weightage > 0 ? `✅ ${weightage}%` : '⚪ 0%';
      console.log(`   └─ ${t.name} ${relevantMark}`);
    });
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n🔍 MISMATCH ANALYSIS:\n');

  // Check which extracted topics match official topics
  const extractedTopics = new Set();
  questions.forEach(q => {
    if (q.topic) extractedTopics.add(q.topic);
  });

  const officialTopicNames = new Set(officialTopics.map(t => t.name));

  console.log('EXTRACTED TOPICS vs OFFICIAL TOPICS:\n');

  Array.from(extractedTopics).sort().forEach(extracted => {
    if (officialTopicNames.has(extracted)) {
      console.log(`   ✅ "${extracted}" → Matches official topic`);
    } else {
      // Try to find close match
      const closestMatch = Array.from(officialTopicNames).find(official =>
        official.toLowerCase().includes(extracted.toLowerCase()) ||
        extracted.toLowerCase().includes(official.toLowerCase())
      );

      if (closestMatch) {
        console.log(`   ⚠️  "${extracted}" → Should be "${closestMatch}"`);
      } else {
        console.log(`   ❌ "${extracted}" → NO MATCH in official syllabus`);
      }
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n📝 SAMPLE QUESTIONS (showing domain/topic assignment):\n');

  questions.slice(0, 5).forEach((q, idx) => {
    console.log(`Q${idx + 1}:`);
    console.log(`   Domain: "${q.domain || 'MISSING'}"`);
    console.log(`   Topic: "${q.topic || 'MISSING'}"`);
    const text = q.text ? q.text.substring(0, 80) : 'No text';
    console.log(`   Text: ${text}...`);
    console.log('');
  });

  console.log('='.repeat(70) + '\n');
}

showScanStructure().catch(console.error);
