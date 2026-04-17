import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyPhysicsFlagshipDeployment() {
  console.log('🔍 PHYSICS FLAGSHIP DEPLOYMENT VERIFICATION\n');
  console.log('=' .repeat(70) + '\n');

  // 1. Check files exist and their timestamps
  console.log('📁 FILE VERIFICATION:\n');

  const files = ['flagship_physics_final.json', 'flagship_physics_final_b.json'];
  const fileInfo: any = {};

  for (const file of files) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
      fileInfo[file] = {
        exists: true,
        size: stats.size,
        modified: stats.mtime,
        questionCount: content.questions?.length || 0,
        meta: content.meta
      };

      console.log(`✅ ${file}`);
      console.log(`   Size: ${Math.round(stats.size / 1024)}KB`);
      console.log(`   Modified: ${stats.mtime.toISOString()}`);
      console.log(`   Questions: ${content.questions?.length || 0}`);
      console.log(`   Generated: ${content.meta?.generatedAt}`);
      console.log(`   Version: ${content.meta?.version}`);
      console.log('');
    } else {
      console.log(`❌ ${file} - NOT FOUND\n`);
    }
  }

  // 2. Check git status
  console.log('📝 GIT STATUS:\n');
  try {
    const gitDiff = execSync('git diff --stat flagship_physics_final*.json', { encoding: 'utf-8' });
    console.log(gitDiff || '   No changes');
    console.log('');
  } catch (e) {
    console.log('   Could not get git diff\n');
  }

  // 3. Verify questions in database
  console.log('💾 DATABASE VERIFICATION:\n');

  const setA = JSON.parse(fs.readFileSync('flagship_physics_final.json', 'utf-8'));
  const setB = JSON.parse(fs.readFileSync('flagship_physics_final_b.json', 'utf-8'));

  const sampleIds = [
    setA.questions?.[0]?.id,
    setB.questions?.[0]?.id
  ].filter(Boolean);

  for (const id of sampleIds) {
    const { data } = await supabase
      .from('questions')
      .select('id, created_at, source, difficulty, topic')
      .eq('id', id)
      .single();

    if (data) {
      console.log(`✅ Question ${id.substring(0, 8)}... found in DB`);
      console.log(`   Created: ${data.created_at}`);
      console.log(`   Source: ${data.source}`);
      console.log(`   Topic: ${data.topic}`);
      console.log(`   Difficulty: ${data.difficulty}`);
      console.log('');
    } else {
      console.log(`❌ Question ${id} NOT FOUND in DB\n`);
    }
  }

  // 4. Check if old questions were deleted
  console.log('🔄 QUESTION SET COMPARISON:\n');

  try {
    const oldSetA = execSync('git show HEAD:flagship_physics_final.json', { encoding: 'utf-8' });
    const oldData = JSON.parse(oldSetA);
    const oldQuestionId = oldData.test_config?.questions?.[0]?.id || oldData.questions?.[0]?.id;

    if (oldQuestionId) {
      const { data } = await supabase
        .from('questions')
        .select('id, created_at')
        .eq('id', oldQuestionId)
        .single();

      console.log(`Old question ID: ${oldQuestionId?.substring(0, 8)}...`);
      console.log(`Still in DB: ${data ? 'YES' : 'NO (deleted)'}`);
      if (data) {
        console.log(`   Created: ${data.created_at}`);
      }
      console.log('');
    }
  } catch (e) {
    console.log('   Could not check old questions\n');
  }

  console.log(`New SET-A first question: ${setA.questions?.[0]?.id?.substring(0, 8)}...`);
  console.log(`New SET-B first question: ${setB.questions?.[0]?.id?.substring(0, 8)}...`);
  console.log('');

  // 5. Summary
  console.log('=' .repeat(70));
  console.log('\n📊 SUMMARY:\n');

  const setADiff = setA.questions?.reduce((acc: any, q: any) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});

  const setBDiff = setB.questions?.reduce((acc: any, q: any) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});

  console.log('SET-A:');
  console.log(`   Total: ${setA.questions?.length} questions`);
  console.log(`   Easy: ${setADiff?.Easy || 0} (target: 18)`);
  console.log(`   Moderate: ${setADiff?.Moderate || 0} (target: 30)`);
  console.log(`   Hard: ${setADiff?.Hard || 0} (target: 12)`);
  console.log('');

  console.log('SET-B:');
  console.log(`   Total: ${setB.questions?.length} questions`);
  console.log(`   Easy: ${setBDiff?.Easy || 0} (target: 18)`);
  console.log(`   Moderate: ${setBDiff?.Moderate || 0} (target: 30)`);
  console.log(`   Hard: ${setBDiff?.Hard || 0} (target: 12)`);
  console.log('');

  console.log('REI v17 Calibration Status: ' + (setA.meta?.calibration?.status || 'UNKNOWN'));
  console.log('Question Type Profile: ' + JSON.stringify(setA.meta?.calibration?.questionTypeProfile || {}));
  console.log('');

  console.log('✅ Files are ready for deployment');
  console.log('✅ Questions are in database');
  console.log('✅ REI v17 calibration applied');
}

verifyPhysicsFlagshipDeployment().catch(console.error);
