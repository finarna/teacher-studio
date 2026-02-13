/**
 * Question-to-Topic Mapping Script
 *
 * Maps existing questions from scans to new syllabus-based topics
 * using AI-powered intelligent matching.
 *
 * Strategy:
 * 1. Fetch all existing questions from database
 * 2. Extract unique topic strings (question.topic field)
 * 3. Fetch all new topics from topics table
 * 4. Use Gemini AI to intelligently map question topics to syllabus topics
 * 5. Create entries in topic_question_mapping table
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const geminiKey = process.env.VITE_GEMINI_API_KEY!;

console.log('Using Supabase URL:', supabaseUrl?.substring(0, 30) + '...');
console.log('Using API Key type:', supabaseKey?.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Check .env.local file.');
}

if (!geminiKey) {
  throw new Error('Missing Gemini API key. Check .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

interface QuestionTopic {
  topic: string;
  subject: string;
  count: number;
  questionIds: string[];
}

interface SyllabusTopic {
  id: string;
  name: string;
  subject: string;
  domain: string;
  description: string;
}

interface TopicMapping {
  questionTopic: string;
  syllabusTopic: SyllabusTopic;
  confidence: number;
  reasoning: string;
}

/**
 * Fetch all unique question topics from existing questions
 */
async function fetchQuestionTopics(): Promise<QuestionTopic[]> {
  console.log('\n📊 Fetching existing questions from database...');

  // Fetch questions
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, topic, scan_id');

  if (questionsError) {
    console.log(`❌ Error fetching questions: ${questionsError.message}`);
    throw new Error(`Failed to fetch questions: ${questionsError.message}`);
  }

  if (!questions || questions.length === 0) {
    console.log('⚠️  No questions found in database.');
    return [];
  }

  console.log(`✅ Found ${questions.length} total questions`);

  // Fetch scans to get subject mapping
  const scanIds = [...new Set(questions.map(q => q.scan_id))];
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('id, subject')
    .in('id', scanIds);

  if (scansError) {
    console.log(`❌ Error fetching scans: ${scansError.message}`);
    throw new Error(`Failed to fetch scans: ${scansError.message}`);
  }

  console.log(`✅ Found ${scans?.length || 0} scans`);

  // Create scan ID -> subject map
  const scanSubjectMap = new Map<string, string>();
  (scans || []).forEach(scan => {
    scanSubjectMap.set(scan.id, scan.subject);
  });

  // Group by topic and subject
  const topicMap = new Map<string, QuestionTopic>();

  for (const q of questions) {
    if (!q.topic) continue;

    const subject = scanSubjectMap.get(q.scan_id);
    if (!subject) continue;

    // Skip generic topics like "Physics", "Mathematics", "Chemistry", "Biology"
    if (['Physics', 'Mathematics', 'Chemistry', 'Biology', 'Math'].includes(q.topic)) {
      continue;
    }

    const key = `${subject}:${q.topic}`;

    if (!topicMap.has(key)) {
      topicMap.set(key, {
        topic: q.topic,
        subject: subject,
        count: 0,
        questionIds: []
      });
    }

    const topicData = topicMap.get(key)!;
    topicData.count++;
    topicData.questionIds.push(q.id);
  }

  const uniqueTopics = Array.from(topicMap.values());
  console.log(`✅ Found ${uniqueTopics.length} unique topic-subject combinations`);

  // Show breakdown
  const subjectBreakdown = uniqueTopics.reduce((acc, t) => {
    acc[t.subject] = (acc[t.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📋 Topics by subject:');
  Object.entries(subjectBreakdown).forEach(([subject, count]) => {
    console.log(`  - ${subject}: ${count} topics`);
  });

  return uniqueTopics;
}

/**
 * Fetch all syllabus topics from topics table
 */
async function fetchSyllabusTopics(): Promise<SyllabusTopic[]> {
  console.log('\n📚 Fetching syllabus topics from database...');

  const { data: topics, error } = await supabase
    .from('topics')
    .select('id, name, subject, domain, description');

  if (error) {
    throw new Error(`Failed to fetch topics: ${error.message}`);
  }

  if (!topics || topics.length === 0) {
    throw new Error('No syllabus topics found. Run seedRealTopics.ts first.');
  }

  console.log(`✅ Found ${topics.length} syllabus topics`);

  const subjectBreakdown = topics.reduce((acc, t) => {
    acc[t.subject] = (acc[t.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📋 Syllabus topics by subject:');
  Object.entries(subjectBreakdown).forEach(([subject, count]) => {
    console.log(`  - ${subject}: ${count} topics`);
  });

  return topics;
}

/**
 * Use Gemini AI to map question topics to syllabus topics
 */
async function mapTopicsWithAI(
  questionTopics: QuestionTopic[],
  syllabusTopics: SyllabusTopic[]
): Promise<TopicMapping[]> {
  console.log('\n🤖 Using Gemini AI to map topics...');

  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  const mappings: TopicMapping[] = [];

  // Process by subject
  const subjects = Array.from(new Set(questionTopics.map(q => q.subject)));

  for (const subject of subjects) {
    console.log(`\n📖 Processing ${subject}...`);

    const subjectQuestionTopics = questionTopics.filter(q => q.subject === subject);
    const subjectSyllabusTopics = syllabusTopics.filter(t => t.subject === subject);

    if (subjectSyllabusTopics.length === 0) {
      console.log(`⚠️  No syllabus topics found for ${subject}, skipping...`);
      continue;
    }

    const prompt = `You are an expert educational content mapper. Map the following question topics to official syllabus topics.

QUESTION TOPICS (from scanned papers):
${subjectQuestionTopics.map((t, i) => `${i + 1}. "${t.topic}" (${t.count} questions)`).join('\n')}

OFFICIAL SYLLABUS TOPICS (Class 12 ${subject}):
${subjectSyllabusTopics.map((t, i) => `${i + 1}. "${t.name}" - ${t.description}`).join('\n')}

TASK: For each question topic, find the best matching syllabus topic.

RULES:
1. Match based on conceptual similarity, not just exact word match
2. Consider that question topics may use abbreviated or informal names
3. If multiple question topics map to the same syllabus topic, that's fine
4. Assign a confidence score (0.0 to 1.0)
5. If no good match exists, use confidence 0.0

OUTPUT FORMAT (JSON array):
[
  {
    "questionTopic": "exact name from question topics list",
    "syllabusTopicName": "exact name from syllabus topics list",
    "confidence": 0.95,
    "reasoning": "Brief explanation of why this mapping makes sense"
  }
]

Return ONLY the JSON array, no other text.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = response;
      if (response.includes('```json')) {
        jsonText = response.split('```json')[1].split('```')[0].trim();
      } else if (response.includes('```')) {
        jsonText = response.split('```')[1].split('```')[0].trim();
      }

      const aiMappings = JSON.parse(jsonText);

      // Process AI mappings
      for (const mapping of aiMappings) {
        const questionTopic = subjectQuestionTopics.find(t => t.topic === mapping.questionTopic);
        const syllabusTopic = subjectSyllabusTopics.find(t => t.name === mapping.syllabusTopicName);

        if (questionTopic && syllabusTopic && mapping.confidence > 0.5) {
          mappings.push({
            questionTopic: questionTopic.topic,
            syllabusTopic: syllabusTopic,
            confidence: mapping.confidence,
            reasoning: mapping.reasoning
          });

          console.log(`  ✅ "${questionTopic.topic}" → "${syllabusTopic.name}" (${(mapping.confidence * 100).toFixed(0)}%)`);
        } else if (questionTopic && mapping.confidence <= 0.5) {
          console.log(`  ⚠️  "${questionTopic.topic}" - No good match (confidence: ${(mapping.confidence * 100).toFixed(0)}%)`);
        }
      }

    } catch (error) {
      console.error(`❌ Error mapping ${subject}:`, error);
      // Continue with other subjects
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return mappings;
}

/**
 * Create topic_question_mapping entries in database
 */
async function createMappings(
  mappings: TopicMapping[],
  questionTopics: QuestionTopic[]
): Promise<void> {
  console.log('\n💾 Creating topic-question mappings in database...');

  let totalMapped = 0;
  let totalQuestions = 0;

  for (const mapping of mappings) {
    const questionTopic = questionTopics.find(q => q.topic === mapping.questionTopic);
    if (!questionTopic) continue;

    // Create mapping for each question in this topic
    for (const questionId of questionTopic.questionIds) {
      const { error } = await supabase
        .from('topic_question_mapping')
        .insert({
          topic_id: mapping.syllabusTopic.id,
          question_id: questionId,
          confidence: mapping.confidence,
          mapped_by: 'ai'
        });

      if (error && !error.message.includes('duplicate')) {
        console.error(`  ❌ Failed to map question ${questionId}:`, error.message);
      } else if (!error) {
        totalQuestions++;
      }
    }

    totalMapped++;
    console.log(`  ✅ Mapped "${mapping.questionTopic}" (${questionTopic.count} questions) to "${mapping.syllabusTopic.name}"`);
  }

  console.log(`\n✅ Successfully created ${totalMapped} topic mappings for ${totalQuestions} questions`);
}

/**
 * Create topic_resources for users based on mapped questions
 */
async function createTopicResources(): Promise<void> {
  console.log('\n👥 Creating topic_resources for users...');

  // Get all users who have questions
  const { data: users, error: usersError } = await supabase
    .from('scans')
    .select('user_id')
    .not('user_id', 'is', null);

  if (usersError) {
    console.error('❌ Failed to fetch users:', usersError.message);
    return;
  }

  const uniqueUserIds = Array.from(new Set(users?.map(u => u.user_id) || []));
  console.log(`✅ Found ${uniqueUserIds.length} users with scans`);

  let resourcesCreated = 0;

  for (const userId of uniqueUserIds) {
    // Get all mapped questions for this user through their scans
    const { data: userScans } = await supabase
      .from('scans')
      .select('id')
      .eq('user_id', userId);

    if (!userScans || userScans.length === 0) continue;

    const scanIds = userScans.map(s => s.id);

    // Get questions from these scans with topic mappings
    const { data: mappedQuestions } = await supabase
      .from('questions')
      .select(`
        id,
        subject,
        topic_question_mapping!inner (
          topic_id,
          topics!inner (
            id,
            subject,
            name
          )
        )
      `)
      .in('scan_id', scanIds);

    if (!mappedQuestions) continue;

    // Group by topic
    const topicGroups = new Map<string, any>();

    for (const q of mappedQuestions) {
      const mapping = (q as any).topic_question_mapping[0];
      if (!mapping) continue;

      const topicId = mapping.topic_id;
      const topic = mapping.topics;

      if (!topicGroups.has(topicId)) {
        topicGroups.set(topicId, {
          topicId,
          subject: topic.subject,
          topicName: topic.name,
          questionIds: []
        });
      }

      topicGroups.get(topicId)!.questionIds.push(q.id);
    }

    // Create topic_resources for each topic
    for (const [topicId, data] of topicGroups) {
      const { error } = await supabase
        .from('topic_resources')
        .upsert({
          user_id: userId,
          topic_id: topicId,
          subject: data.subject,
          exam_context: 'NEET', // Default, can be updated later
          total_questions: data.questionIds.length,
          source_scan_ids: scanIds
        }, {
          onConflict: 'user_id,topic_id,exam_context'
        });

      if (!error) {
        resourcesCreated++;
      }
    }
  }

  console.log(`✅ Created ${resourcesCreated} topic_resources entries`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🗺️  QUESTION-TO-TOPIC MAPPING SCRIPT');
  console.log('=' .repeat(60));

  try {
    // Step 1: Fetch existing question topics
    const questionTopics = await fetchQuestionTopics();

    if (questionTopics.length === 0) {
      console.log('\n⚠️  No questions found to map. Upload some scans first.');
      return;
    }

    // Step 2: Fetch syllabus topics
    const syllabusTopics = await fetchSyllabusTopics();

    // Step 3: Use AI to map topics
    const mappings = await mapTopicsWithAI(questionTopics, syllabusTopics);

    if (mappings.length === 0) {
      console.log('\n⚠️  No mappings created. Check if subjects match between questions and topics.');
      return;
    }

    console.log(`\n📊 Mapping Summary:`);
    console.log(`  - Question topics analyzed: ${questionTopics.length}`);
    console.log(`  - Syllabus topics available: ${syllabusTopics.length}`);
    console.log(`  - Successful mappings: ${mappings.length}`);
    console.log(`  - Coverage: ${((mappings.length / questionTopics.length) * 100).toFixed(1)}%`);

    // Step 4: Create mappings in database
    await createMappings(mappings, questionTopics);

    // Step 5: Create topic_resources for users
    await createTopicResources();

    console.log('\n' + '='.repeat(60));
    console.log('✅ MAPPING COMPLETE!');
    console.log('\n🎉 Your Learning Journey dashboard should now show data.');
    console.log('📊 Navigate to: http://localhost:9000 → Learning Journey');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Error during mapping:', error);
    throw error;
  }
}

// Run mapping
main();
