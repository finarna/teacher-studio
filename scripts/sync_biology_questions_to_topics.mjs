/**
 * Sync Biology Questions from Scans to Questions Table
 *
 * Biology scans store questions in analysis_data.questions (JSON),
 * but the Learning Journey needs questions in the questions table
 * with topic mappings for the topic dashboard to work.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapping from scan domains to topic names in database
const DOMAIN_TO_TOPIC_MAP = {
  'Biology in Human Welfare': 'Microbes in Human Welfare',
  'Biotechnology': 'Biotechnology and its Applications',
  'Ecology': 'Ecosystem',
  'Genetics and Evolution': 'Evolution',
  'Reproduction': 'Sexual Reproduction in Flowering Plants',
  'Human Health and Disease': 'Human Health and Disease',
  'Organisms and Populations': 'Organisms and Populations',
  'Biodiversity and Conservation': 'Biodiversity and Conservation',
  'Molecular Basis of Inheritance': 'Molecular Basis of Inheritance',
  'Principles of Inheritance and Variation': 'Principles of Inheritance and Variation'
};

async function syncBiologyQuestions() {
  console.log('🔄 Syncing Biology Questions from Scans to Questions Table\n');
  console.log('='.repeat(70));

  try {
    // 1. Get all Biology scans with questions
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('id, name, subject, exam_context, year, analysis_data, user_id')
      .eq('subject', 'Biology');

    if (scansError) throw scansError;
    if (!scans || scans.length === 0) {
      console.log('⚠️  No Biology scans found');
      return;
    }

    console.log(`\n📚 Found ${scans.length} Biology scan(s)\n`);

    // 2. Get topic IDs for mapping
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name, subject')
      .eq('subject', 'Biology');

    if (topicsError) throw topicsError;

    const topicNameToId = {};
    topics?.forEach(t => {
      topicNameToId[t.name] = t.id;
    });

    console.log(`📊 Found ${topics?.length || 0} Biology topics in database\n`);

    let totalQuestionsCreated = 0;
    let totalMappingsCreated = 0;

    // 3. Process each scan
    for (const scan of scans) {
      const questions = scan.analysis_data?.questions || [];

      if (questions.length === 0) continue;

      console.log(`\n📄 Processing: ${scan.name.substring(0, 60)}`);
      console.log(`   ${questions.length} questions to sync`);

      let createdCount = 0;
      let mappingCount = 0;

      // 4. Insert questions into questions table
      for (const q of questions) {
        const questionId = `${scan.id}-${q.id}`;

        // Check if question already exists
        const { data: existing } = await supabase
          .from('questions')
          .select('id')
          .eq('id', questionId)
          .single();

        if (existing) {
          console.log(`   ⏭️  Question ${q.id} already exists, skipping`);
          continue;
        }

        // Insert question
        const { error: insertError } = await supabase
          .from('questions')
          .insert({
            id: questionId,
            scan_id: scan.id,
            subject: scan.subject,
            exam_context: scan.exam_context,
            year: scan.year,
            question_text: q.question || '',
            marks: parseInt(q.marks) || 1,
            difficulty: q.difficulty || 'Moderate',
            blooms: q.blooms || 'Understanding',
            domain: q.domain || 'General',
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`   ❌ Failed to insert question ${q.id}:`, insertError.message);
          continue;
        }

        createdCount++;

        // 5. Create topic mapping if domain matches a topic
        const topicName = DOMAIN_TO_TOPIC_MAP[q.domain] || q.domain;
        const topicId = topicNameToId[topicName];

        if (topicId) {
          const { error: mappingError } = await supabase
            .from('topic_question_mapping')
            .insert({
              topic_id: topicId,
              question_id: questionId,
              created_at: new Date().toISOString()
            });

          if (!mappingError) {
            mappingCount++;
          }
        }
      }

      console.log(`   ✅ Created ${createdCount} questions, ${mappingCount} topic mappings`);
      totalQuestionsCreated += createdCount;
      totalMappingsCreated += mappingCount;
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Sync Complete!`);
    console.log(`   📝 Total questions created: ${totalQuestionsCreated}`);
    console.log(`   🔗 Total topic mappings created: ${totalMappingsCreated}`);
    console.log(`\n🎉 Biology topics should now appear in Learning Journey!`);
    console.log(`   Refresh the page to see all topics with questions.`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncBiologyQuestions();
