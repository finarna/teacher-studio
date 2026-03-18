import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAIPredictions() {
  console.log('\n🔍 VERIFYING AI PREDICTION SETTINGS FOR NEET & KCET\n');
  console.log('='.repeat(80));

  // 1. Check NEET Historical Patterns
  console.log('\n📊 1. NEET HISTORICAL PATTERNS\n');
  const { data: neetPatterns, error: neetPatternsError } = await supabase
    .from('exam_historical_patterns')
    .select('year, subject, difficulty_easy_pct, difficulty_moderate_pct, difficulty_hard_pct, board_signature, ids_actual, rigor_velocity, intent_signature, evolution_note')
    .eq('exam_context', 'NEET')
    .order('year', { ascending: false })
    .order('subject', { ascending: true });

  if (neetPatternsError) {
    console.error('❌ Error fetching NEET patterns:', neetPatternsError);
  } else if (!neetPatterns || neetPatterns.length === 0) {
    console.log('⚠️  NO NEET HISTORICAL PATTERNS FOUND IN DATABASE');
  } else {
    console.log(`✅ Found ${neetPatterns.length} NEET historical pattern records:\n`);
    neetPatterns.forEach(p => {
      console.log(`   Year: ${p.year} | Subject: ${p.subject}`);
      console.log(`   Difficulty: Easy ${p.difficulty_easy_pct}% | Moderate ${p.difficulty_moderate_pct}% | Hard ${p.difficulty_hard_pct}%`);
      console.log(`   Board Signature: ${p.board_signature || 'NOT SET'}`);
      console.log(`   IDS Actual: ${p.ids_actual || 'NOT SET'}`);
      console.log(`   Rigor Velocity: ${p.rigor_velocity || 'NOT SET'}`);
      console.log(`   Intent Signature: ${p.intent_signature ? JSON.stringify(p.intent_signature).substring(0, 100) : 'NOT SET'}`);
      console.log(`   Evolution Note: ${p.evolution_note || 'NOT SET'}`);
      console.log('');
    });
  }

  // 2. Check KCET Math Historical Patterns
  console.log('\n📊 2. KCET MATH HISTORICAL PATTERNS\n');
  const { data: kcetPatterns, error: kcetPatternsError } = await supabase
    .from('exam_historical_patterns')
    .select('year, subject, difficulty_easy_pct, difficulty_moderate_pct, difficulty_hard_pct, board_signature, ids_actual, rigor_velocity, intent_signature, evolution_note')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Mathematics')
    .order('year', { ascending: false });

  if (kcetPatternsError) {
    console.error('❌ Error fetching KCET Math patterns:', kcetPatternsError);
  } else if (!kcetPatterns || kcetPatterns.length === 0) {
    console.log('⚠️  NO KCET MATH HISTORICAL PATTERNS FOUND IN DATABASE');
  } else {
    console.log(`✅ Found ${kcetPatterns.length} KCET Math historical pattern records:\n`);
    kcetPatterns.forEach(p => {
      console.log(`   Year: ${p.year} | Subject: ${p.subject}`);
      console.log(`   Difficulty: Easy ${p.difficulty_easy_pct}% | Moderate ${p.difficulty_moderate_pct}% | Hard ${p.difficulty_hard_pct}%`);
      console.log(`   Board Signature: ${p.board_signature || 'NOT SET'}`);
      console.log(`   IDS Actual: ${p.ids_actual || 'NOT SET'}`);
      console.log(`   Rigor Velocity: ${p.rigor_velocity || 'NOT SET'}`);
      console.log(`   Intent Signature: ${p.intent_signature ? JSON.stringify(p.intent_signature).substring(0, 100) : 'NOT SET'}`);
      console.log(`   Evolution Note: ${p.evolution_note ? p.evolution_note.substring(0, 100) + '...' : 'NOT SET'}`);
      console.log('');
    });
  }

  // 3. Check NEET Scans
  console.log('\n📄 3. NEET SCANS IN DATABASE\n');
  const { data: neetScans, error: neetScansError } = await supabase
    .from('scans')
    .select('id, name, year, subject, subjects, exam_context, is_system_scan, created_at')
    .eq('exam_context', 'NEET')
    .eq('is_system_scan', true)
    .order('year', { ascending: false });

  if (neetScansError) {
    console.error('❌ Error fetching NEET scans:', neetScansError);
  } else if (!neetScans || neetScans.length === 0) {
    console.log('⚠️  NO NEET SYSTEM SCANS FOUND IN DATABASE');
  } else {
    console.log(`✅ Found ${neetScans.length} NEET system scan records:\n`);
    neetScans.forEach(s => {
      console.log(`   ${s.year} | ${s.subject || s.subjects?.join(', ')} | ${s.name}`);
    });
  }

  // 4. Check KCET Math Scans
  console.log('\n📄 4. KCET MATH SCANS IN DATABASE\n');
  const { data: kcetScans, error: kcetScansError } = await supabase
    .from('scans')
    .select('id, name, year, subject, exam_context, is_system_scan, created_at')
    .eq('exam_context', 'KCET')
    .eq('subject', 'Mathematics')
    .eq('is_system_scan', true)
    .order('year', { ascending: false });

  if (kcetScansError) {
    console.error('❌ Error fetching KCET Math scans:', kcetScansError);
  } else if (!kcetScans || kcetScans.length === 0) {
    console.log('⚠️  NO KCET MATH SYSTEM SCANS FOUND IN DATABASE');
  } else {
    console.log(`✅ Found ${kcetScans.length} KCET Math system scan records:\n`);
    kcetScans.forEach(s => {
      console.log(`   ${s.year} | ${s.subject} | ${s.name}`);
    });
  }

  // 5. Check AI Universal Calibration (Forecasts)
  console.log('\n🔮 5. AI CALIBRATION FORECASTS\n');

  console.log('NEET Forecasts:');
  const { data: neetCal, error: neetCalError } = await supabase
    .from('ai_universal_calibration')
    .select('subject, target_year, rigor_velocity, board_signature, calibration_directives, intent_signature')
    .eq('exam_type', 'NEET')
    .order('subject', { ascending: true });

  if (neetCalError) {
    console.error('❌ Error fetching NEET calibration:', neetCalError);
  } else if (!neetCal || neetCal.length === 0) {
    console.log('⚠️  NO NEET AI CALIBRATION FORECASTS FOUND');
  } else {
    console.log(`✅ Found ${neetCal.length} NEET forecast records:\n`);
    neetCal.forEach(c => {
      console.log(`   Subject: ${c.subject} | Year: ${c.target_year}`);
      console.log(`   Board Signature: ${c.board_signature || 'NOT SET'}`);
      console.log(`   Rigor Velocity: ${c.rigor_velocity || 'NOT SET'}`);
      console.log(`   Calibration Directives: ${c.calibration_directives?.length || 0} directives`);
      console.log('');
    });
  }

  console.log('KCET Math Forecasts:');
  const { data: kcetCal, error: kcetCalError } = await supabase
    .from('ai_universal_calibration')
    .select('subject, target_year, rigor_velocity, board_signature, calibration_directives, intent_signature')
    .eq('exam_type', 'KCET')
    .eq('subject', 'Mathematics')
    .order('target_year', { ascending: false });

  if (kcetCalError) {
    console.error('❌ Error fetching KCET Math calibration:', kcetCalError);
  } else if (!kcetCal || kcetCal.length === 0) {
    console.log('⚠️  NO KCET MATH AI CALIBRATION FORECASTS FOUND');
  } else {
    console.log(`✅ Found ${kcetCal.length} KCET Math forecast records:\n`);
    kcetCal.forEach(c => {
      console.log(`   Subject: ${c.subject} | Year: ${c.target_year}`);
      console.log(`   Board Signature: ${c.board_signature || 'NOT SET'}`);
      console.log(`   Rigor Velocity: ${c.rigor_velocity || 'NOT SET'}`);
      console.log(`   Calibration Directives: ${c.calibration_directives?.length || 0} directives`);
      console.log('');
    });
  }

  // 6. Check Topic Distributions
  console.log('\n🎯 6. TOPIC DISTRIBUTIONS\n');

  console.log('NEET Topic Distributions:');
  const { data: neetTopics, error: neetTopicsError } = await supabase
    .from('exam_topic_distributions')
    .select('topic_id, question_count, average_marks, difficulty_easy_count, difficulty_moderate_count, difficulty_hard_count, exam_historical_patterns!inner(year, subject, exam_context)')
    .eq('exam_historical_patterns.exam_context', 'NEET')
    .limit(20);

  if (neetTopicsError) {
    console.error('❌ Error fetching NEET topics:', neetTopicsError);
  } else if (!neetTopics || neetTopics.length === 0) {
    console.log('⚠️  NO NEET TOPIC DISTRIBUTIONS FOUND');
  } else {
    console.log(`✅ Found ${neetTopics.length}+ NEET topic distribution records (showing first 20):\n`);
    const grouped = neetTopics.reduce((acc, t: any) => {
      const year = t.exam_historical_patterns?.year;
      const subject = t.exam_historical_patterns?.subject;
      const key = `${year}-${subject}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(grouped).forEach(([key, topics]) => {
      console.log(`   ${key}: ${topics.length} topics tracked`);
    });
    console.log('');
  }

  console.log('KCET Math Topic Distributions:');
  const { data: kcetTopics, error: kcetTopicsError } = await supabase
    .from('exam_topic_distributions')
    .select('topic_id, question_count, average_marks, difficulty_easy_count, difficulty_moderate_count, difficulty_hard_count, exam_historical_patterns!inner(year, subject, exam_context)')
    .eq('exam_historical_patterns.exam_context', 'KCET')
    .eq('exam_historical_patterns.subject', 'Mathematics');

  if (kcetTopicsError) {
    console.error('❌ Error fetching KCET Math topics:', kcetTopicsError);
  } else if (!kcetTopics || kcetTopics.length === 0) {
    console.log('⚠️  NO KCET MATH TOPIC DISTRIBUTIONS FOUND');
  } else {
    console.log(`✅ Found ${kcetTopics.length} KCET Math topic distribution records:\n`);
    const grouped = kcetTopics.reduce((acc, t: any) => {
      const year = t.exam_historical_patterns?.year;
      const key = `${year}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(grouped).forEach(([key, topics]) => {
      console.log(`   ${key}: ${topics.length} topics tracked`);
    });
    console.log('');
  }

  // 7. Check REI Evolution Configs
  console.log('\n⚙️  7. REI EVOLUTION CONFIGS (BASELINE SETTINGS)\n');

  const { data: reiConfigs, error: reiConfigsError } = await supabase
    .from('rei_evolution_configs')
    .select('exam_context, subject, rigor_drift_multiplier, ids_baseline, synthesis_weight, trap_density_weight, linguistic_load_weight, speed_requirement_weight')
    .in('exam_context', ['NEET', 'KCET'])
    .order('exam_context', { ascending: true })
    .order('subject', { ascending: true });

  if (reiConfigsError) {
    console.error('❌ Error fetching REI configs:', reiConfigsError);
  } else if (!reiConfigs || reiConfigs.length === 0) {
    console.log('⚠️  NO REI EVOLUTION CONFIGS FOUND');
  } else {
    console.log(`✅ Found ${reiConfigs.length} REI evolution config records:\n`);
    reiConfigs.forEach(c => {
      console.log(`   ${c.exam_context} - ${c.subject}:`);
      console.log(`   IDS Baseline: ${c.ids_baseline} | Rigor Drift: ${c.rigor_drift_multiplier}`);
      console.log(`   Intent Weights: Synthesis=${c.synthesis_weight}, Trap=${c.trap_density_weight}, Linguistic=${c.linguistic_load_weight}, Speed=${c.speed_requirement_weight}`);
      console.log('');
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ VERIFICATION COMPLETE\n');
}

verifyAIPredictions().catch(console.error);
