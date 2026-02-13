import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubscription() {
  console.log('=== SUBSCRIPTION CHECK FOR prabhubp@gmail.com ===\n');

  // Get user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'prabhubp@gmail.com');

  if (userError || !users || users.length === 0) {
    console.log('❌ User not found');
    return;
  }

  const user = users[0];
  console.log('✅ User Found:');
  console.log('   ID:', user.id);
  console.log('   Name:', user.full_name);
  console.log('   Email:', user.email);

  // Get subscription with plan details
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plans:plan_id (
        name,
        description,
        price,
        duration_days
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (subError) {
    console.error('❌ Error fetching subscription:', subError);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('\n❌ No subscriptions found for this user');
    return;
  }

  const latest = subscriptions[0];
  const periodEnd = new Date(latest.current_period_end);
  const periodStart = new Date(latest.current_period_start);
  const now = new Date();
  const isValid = periodEnd > now;
  const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  console.log('\n=== SUBSCRIPTION DETAILS ===');
  console.log('Status:', latest.status === 'active' ? '✅ ACTIVE' : '❌ ' + latest.status.toUpperCase());
  console.log('Plan ID:', latest.plan_id);
  console.log('Plan Name:', latest.plans?.name || 'N/A');
  console.log('Period Start:', periodStart.toLocaleDateString());
  console.log('Period End:', periodEnd.toLocaleDateString());
  console.log('Valid Until:', isValid ? `✅ YES (${daysRemaining} days remaining)` : '❌ EXPIRED');
  console.log('Scans Used:', latest.scans_used);
  console.log('Scans Limit:', latest.scans_limit === -1 ? 'UNLIMITED' : latest.scans_limit);
  console.log('Cancel at Period End:', latest.cancel_at_period_end ? 'YES' : 'NO');
  console.log('RazorPay Subscription ID:', latest.razorpay_subscription_id || 'N/A');
  console.log('Created At:', new Date(latest.created_at).toLocaleString());
  console.log('Updated At:', new Date(latest.updated_at).toLocaleString());

  // Check all subscriptions history
  if (subscriptions.length > 1) {
    console.log(`\n=== SUBSCRIPTION HISTORY (${subscriptions.length} total) ===`);
    subscriptions.forEach((sub, idx) => {
      const start = new Date(sub.current_period_start).toLocaleDateString();
      const end = new Date(sub.current_period_end).toLocaleDateString();
      console.log(`${idx + 1}. Status: ${sub.status}, Period: ${start} - ${end}`);
    });
  }
}

checkSubscription().catch(console.error);
