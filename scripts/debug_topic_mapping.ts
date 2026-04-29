import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import neetPhysics from '../lib/oracle/identities/neet_physics.json';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugTopicMapping() {
  console.log('🔍 Debugging Topic Mapping\n');

  // Get unique topics from database
  const { data: questions } = await supabase
    .from('questions')
    .select('topic')
    .eq('subject', 'Physics')
    .eq('exam_context', 'NEET')
    .eq('year', 2022);

  const dbTopics = new Set(questions?.map(q => q.topic) || []);

  console.log('📊 Database Topics (2022):');
  Array.from(dbTopics).sort().forEach(topic => {
    console.log(`  - ${topic}`);
  });

  console.log('\n📚 Identity Bank Topics:');
  const identityTopics = new Set(neetPhysics.identities.map(id => id.topic));
  Array.from(identityTopics).sort().forEach(topic => {
    console.log(`  - ${topic}`);
  });

  console.log('\n❌ DB Topics NOT in Identity Bank:');
  Array.from(dbTopics).forEach(dbTopic => {
    const found = neetPhysics.identities.some(id =>
      (id.topic || id.name).toLowerCase() === dbTopic.toLowerCase()
    );
    if (!found) {
      console.log(`  - "${dbTopic}"`);
    }
  });

  console.log('\n✅ Matching Topics:');
  let matchCount = 0;
  Array.from(dbTopics).forEach(dbTopic => {
    const matches = neetPhysics.identities.filter(id =>
      (id.topic || id.name).toLowerCase() === dbTopic.toLowerCase()
    );
    if (matches.length > 0) {
      matchCount++;
      console.log(`  - "${dbTopic}" → ${matches.length} identities: ${matches.map(m => m.id).join(', ')}`);
    }
  });

  console.log(`\n📈 Match Rate: ${matchCount}/${dbTopics.size} = ${(matchCount/dbTopics.size*100).toFixed(1)}%`);
}

debugTopicMapping().catch(console.error);
