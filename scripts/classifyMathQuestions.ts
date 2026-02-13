/**
 * Classify Generic Math Questions to Specific Topics
 *
 * Problem: 110 questions have topic="Mathematics" (generic)
 * Solution: Use Gemini AI to read question text and assign to official topics
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const geminiKey = process.env.VITE_GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

interface MathTopic {
  id: string;
  name: string;
  description: string;
}

async function main() {
  console.log('🔢 CLASSIFYING GENERIC MATH QUESTIONS\n');
  console.log('='.repeat(70));

  // 1. Get Math scans
  const { data: mathScans } = await supabase
    .from('scans')
    .select('id')
    .eq('subject', 'Math');

  if (!mathScans || mathScans.length === 0) {
    console.log('❌ No Math scans found');
    return;
  }

  const scanIds = mathScans.map(s => s.id);
  console.log(`✅ Found ${mathScans.length} Math scans\n`);

  // 2. Get questions with generic "Mathematics" topic
  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, options')
    .in('scan_id', scanIds)
    .eq('topic', 'Mathematics');

  console.log(`📊 Found ${questions?.length || 0} questions with generic "Mathematics" topic\n`);

  if (!questions || questions.length === 0) {
    console.log('✅ No questions to classify!');
    return;
  }

  // 3. Get official Math topics
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name, description')
    .eq('subject', 'Math');

  if (!topics || topics.length === 0) {
    console.log('❌ No Math topics found in database');
    return;
  }

  console.log(`📚 Official Math Topics (${topics.length}):`);
  topics.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name}`);
  });
  console.log('');

  // 4. Classify questions in batches of 10
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  const batchSize = 10;
  let totalMapped = 0;

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    console.log(`\n🤖 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} questions)...\n`);

    const prompt = `You are an expert in Class 12 Mathematics (CBSE/KCET syllabus). Classify each question into ONE of the following topics:

AVAILABLE TOPICS:
${topics.map((t, idx) => `${idx + 1}. ${t.name} - ${t.description || 'Class 12 topic'}`).join('\n')}

QUESTIONS TO CLASSIFY:
${batch.map((q, idx) => `
Question ${idx + 1}:
${q.text}
Options: ${JSON.stringify(q.options || [])}
`).join('\n---\n')}

TASK: For each question, determine which topic it belongs to based on the mathematical concepts tested.

OUTPUT FORMAT (JSON array):
[
  {
    "questionNumber": 1,
    "topicName": "exact topic name from list above",
    "confidence": 0.95,
    "reasoning": "brief explanation"
  },
  ...
]

Return ONLY the JSON array, no other text.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Extract JSON
      let jsonText = response;
      if (response.includes('```json')) {
        jsonText = response.split('```json')[1].split('```')[0].trim();
      } else if (response.includes('```')) {
        jsonText = response.split('```')[1].split('```')[0].trim();
      }

      const classifications = JSON.parse(jsonText);

      // Create mappings
      for (const classification of classifications) {
        const questionIdx = classification.questionNumber - 1;
        const question = batch[questionIdx];
        const topic = topics.find(t => t.name === classification.topicName);

        if (question && topic && classification.confidence > 0.7) {
          // Create mapping
          const { error } = await supabase
            .from('topic_question_mapping')
            .insert({
              topic_id: topic.id,
              question_id: question.id,
              confidence: classification.confidence,
              mapped_by: 'ai'
            });

          if (!error) {
            console.log(`  ✅ Q${i + questionIdx + 1} → "${topic.name}" (${(classification.confidence * 100).toFixed(0)}%)`);
            totalMapped++;
          } else if (!error.message.includes('duplicate')) {
            console.log(`  ❌ Failed to map Q${i + questionIdx + 1}: ${error.message}`);
          }
        } else if (classification.confidence <= 0.7) {
          console.log(`  ⚠️  Q${i + questionIdx + 1} - Low confidence (${(classification.confidence * 100).toFixed(0)}%)`);
        }
      }

    } catch (error: any) {
      console.error(`❌ Error processing batch: ${error.message}`);
    }

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ Classification complete!`);
  console.log(`📊 Successfully mapped ${totalMapped} / ${questions.length} questions`);
  console.log(`📈 Coverage: ${((totalMapped / questions.length) * 100).toFixed(1)}%\n`);
  console.log('🎯 Next: Refresh Learning Journey to see Math topics with questions!');
  console.log('='.repeat(70));
}

main().catch(console.error);
