import { supabaseAdmin } from './lib/supabaseServer.ts';

async function checkDuplicates() {
  // First, get current user ID
  const { data: users, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', 'prabhubp@gmail.com')
    .single();

  if (userError) {
    console.error('❌ Error fetching user:', userError);
  }
  console.log('👤 User:', users?.email, '(' + users?.id + ')');

  const userId = users?.id || '9a9c0697-a37c-468a-9c05-a7f2a64f6844';
  const { data, error } = await supabaseAdmin
    .from('scans')
    .select('id, name, scan_date, created_at, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log(`\n📊 Total scans: ${data.length}\n`);

  const nameGroups = {};
  data.forEach(scan => {
    const scanTime = new Date(scan.scan_date || scan.created_at).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    const displayName = `${scan.name} [${scanTime}]`;
    if (!nameGroups[displayName]) {
      nameGroups[displayName] = [];
    }
    nameGroups[displayName].push(scan.id);
  });

  let duplicateCount = 0;
  Object.entries(nameGroups).forEach(([name, ids]) => {
    if (ids.length > 1) {
      console.log(`❌ DUPLICATE: ${name} (${ids.length} copies)`);
      ids.forEach(id => console.log(`   ${id}`));
      console.log('');
      duplicateCount += ids.length - 1; // Count extras
    }
  });

  if (duplicateCount === 0) {
    console.log('✅ No duplicates found!');
  } else {
    console.log(`\n⚠️ Found ${duplicateCount} duplicate scan(s) that could be removed`);
  }
}

checkDuplicates();
