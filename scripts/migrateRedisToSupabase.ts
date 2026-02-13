/**
 * Migrate all Redis data to Supabase
 * This ensures data persistence and enables Learning Journey features
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

// Generate deterministic UUID from scan ID
function generateUUID(scanId: string): string {
  const hash = crypto.createHash('md5').update(scanId).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = '7c84204b-51f0-49e7-9155-86ea1ebd9379'; // prabhubp@gmail.com

async function migrateToSupabase() {
  console.log('=== MIGRATING REDIS DATA TO SUPABASE ===\n');

  try {
    // Fetch all scans from Redis via API
    const response = await fetch('http://localhost:9001/api/scans');
    const scans = await response.json();

    console.log(`Found ${scans.length} scans in Redis\n`);

    let migratedScans = 0;
    let migratedQuestions = 0;

    for (const scan of scans) {
      console.log(`Migrating: ${scan.name} (${scan.subject})`);

      // Generate UUID from scan ID
      const scanUUID = generateUUID(scan.id);

      // Check if scan already exists
      const { data: existingScan } = await supabase
        .from('scans')
        .select('id')
        .eq('id', scanUUID)
        .single();

      if (existingScan) {
        console.log(`  ⏭️  Scan already exists, checking questions...`);
      } else {
        // Insert scan
        const { error: scanError } = await supabase
          .from('scans')
          .insert({
            id: scanUUID,
            user_id: userId,
            name: scan.name,
            subject: scan.subject,
            grade: scan.grade || '12th',
            exam_context: scan.examContext || 'KCET',
            status: scan.status || 'Completed',
            summary: scan.analysisData?.summary,
            overall_difficulty: scan.analysisData?.overallDifficulty || 'Moderate',
            analysis_data: scan.analysisData,
            difficulty_distribution: scan.analysisData?.difficultyDistribution,
            blooms_taxonomy: scan.analysisData?.bloomsTaxonomy,
            topic_weightage: scan.analysisData?.topicWeightage,
            trends: scan.analysisData?.trends,
            predictive_topics: scan.analysisData?.predictiveTopics,
            faq: scan.analysisData?.faq,
            strategy: scan.analysisData?.strategy,
            scan_date: new Date(scan.timestamp || Date.now()).toISOString(),
            metadata: {}
          });

        if (scanError) {
          console.error(`  ❌ Error inserting scan:`, scanError.message);
          continue;
        }

        console.log(`  ✅ Scan inserted`);
        migratedScans++;
      }

      // Migrate questions
      const questions = scan.analysisData?.questions || [];

      if (questions.length > 0) {
        // Check if questions already exist
        const { data: existingQuestions } = await supabase
          .from('questions')
          .select('id')
          .eq('scan_id', scanUUID);

        if (existingQuestions && existingQuestions.length > 0) {
          console.log(`  ⏭️  ${existingQuestions.length} questions already exist`);
        } else {
          // Insert questions
          const questionsToInsert = questions.map((q: any, index: number) => {
            const questionId = q.id || `${scan.id}-q${index + 1}`;
            return {
              id: generateUUID(questionId),
              scan_id: scanUUID,
              text: q.text || '',
            marks: q.marks || 1,
            difficulty: q.difficulty || 'Moderate',
            topic: q.topic || 'General',
            blooms: q.blooms || 'Remember',
            options: q.options || [],
            correct_option_index: q.correctOptionIndex ?? null,
            solution_steps: q.solutionSteps || [],
            exam_tip: q.examTip || '',
            visual_concept: q.visualConcept || '',
            key_formulas: q.keyFormulas || [],
            pitfalls: q.pitfalls || [],
            mastery_material: q.masteryMaterial || null,
            has_visual_element: q.hasVisualElement || false,
            visual_element_type: q.visualElementType || null,
            visual_element_description: q.visualElementDescription || null,
            diagram_url: q.diagramUrl || null,
            sketch_svg_url: q.sketchSvg || null,
            source: q.source || 'scan'
          };
          });

          const { error: questionsError } = await supabase
            .from('questions')
            .insert(questionsToInsert);

          if (questionsError) {
            console.error(`  ❌ Error inserting questions:`, questionsError.message);
          } else {
            console.log(`  ✅ Inserted ${questionsToInsert.length} questions`);
            migratedQuestions += questionsToInsert.length;
          }
        }
      }
    }

    console.log('\n=== MIGRATION COMPLETE ===');
    console.log(`✅ Migrated ${migratedScans} new scans`);
    console.log(`✅ Migrated ${migratedQuestions} new questions`);

    // Verify migration
    const { data: finalScans } = await supabase
      .from('scans')
      .select('id')
      .eq('user_id', userId);

    const { data: finalQuestions } = await supabase
      .from('questions')
      .select('id')
      .eq('user_id', userId);

    console.log('\n=== VERIFICATION ===');
    console.log(`📊 Total scans in Supabase: ${finalScans?.length || 0}`);
    console.log(`❓ Total questions in Supabase: ${finalQuestions?.length || 0}`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrateToSupabase()
  .then(() => console.log('\n✅ Migration successful!'))
  .catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
