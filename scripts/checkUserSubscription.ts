import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubscription() {
  console.log('Checking subscription for prabhubp@gmail.com...\n');
  
  // Get user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'prabhubp@gmail.com');
  
  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log('User not found');
    return;
  }
  
  console.log('User:', JSON.stringify(users[0], null, 2));
  
  // Get subscription
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', users[0].id)
    .order('created_at', { ascending: false });
  
  if (subError) {
    console.error('Error fetching subscription:', subError);
    return;
  }
  
  console.log('\nSubscriptions:', JSON.stringify(subscriptions, null, 2));
  
  // Check if subscription is active
  if (subscriptions && subscriptions.length > 0) {
    const latest = subscriptions[0];
    console.log('\n=== Latest Subscription Status ===');
    console.log('Status:', latest.status);
    console.log('Plan Type:', latest.plan_type);
    console.log('Start Date:', latest.start_date);
    console.log('End Date:', latest.end_date);
    console.log('Created At:', latest.created_at);
    console.log('Updated At:', latest.updated_at);
    
    // Check if it's still valid
    const endDate = new Date(latest.end_date);
    const now = new Date();
    console.log('\nIs subscription still valid?', endDate > now ? 'YES' : 'NO');
    console.log('Days remaining:', Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  } else {
    console.log('\nNo subscriptions found for this user');
  }
}

checkSubscription().catch(console.error);
