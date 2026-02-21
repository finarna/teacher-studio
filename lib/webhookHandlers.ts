/**
 * RazorPay Webhook Event Handlers
 * Processes payment and subscription events from RazorPay
 */

import { supabaseAdmin } from './supabaseServer.ts';

interface WebhookEvent {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
        method?: string;
        email?: string;
        contact?: string;
        error_code?: string;
        error_description?: string;
      };
    };
    subscription?: {
      entity: {
        id: string;
        status: string;
        plan_id: string;
        customer_id: string;
        start_at: number;
        end_at: number;
      };
    };
  };
}

/**
 * Check if webhook event has already been processed (idempotency)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .eq('processed', true)
    .single();

  return !!data && !error;
}

/**
 * Log webhook event
 */
async function logWebhookEvent(eventId: string, eventType: string, payload: any) {
  const { error } = await supabaseAdmin
    .from('webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      payload,
      processed: false,
    });

  if (error) {
    console.error('Failed to log webhook event:', error);
  }
}

/**
 * Mark webhook event as processed
 */
async function markEventProcessed(eventId: string, success: boolean, errorMessage?: string) {
  const { error } = await supabaseAdmin
    .from('webhook_events')
    .update({
      processed: success,
      processed_at: new Date().toISOString(),
      error_message: errorMessage || null,
    })
    .eq('event_id', eventId);

  if (error) {
    console.error('Failed to update webhook event:', error);
  }
}

/**
 * Handle payment.captured event
 * Updates payment record and activates subscription
 */
export async function handlePaymentCaptured(event: WebhookEvent) {
  const eventId = `${event.event}_${event.payload.payment?.entity.id}`;

  console.log(`🔔 Webhook: payment.captured - ${eventId}`);

  // Check idempotency
  if (await isEventProcessed(eventId)) {
    console.log(`⚠️ Event ${eventId} already processed, skipping`);
    return { success: true, message: 'Already processed' };
  }

  await logWebhookEvent(eventId, event.event, event.payload);

  try {
    const payment = event.payload.payment?.entity;
    if (!payment) throw new Error('No payment data in webhook');

    // Update payment record
    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id: payment.id,
        status: 'captured',
        method: payment.method,
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', payment.order_id)
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Activate subscription if linked
    if (paymentRecord.subscription_id) {
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRecord.subscription_id);

      if (subError) throw subError;

      console.log(`✅ Subscription ${paymentRecord.subscription_id} activated`);

      // Queue welcome email
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, plan_id')
        .eq('id', paymentRecord.subscription_id)
        .single();

      if (subscription) {
        await queueEmail(subscription.user_id, 'payment_success', {
          subscription_id: paymentRecord.subscription_id,
          amount: payment.amount / 100,
        });
      }
    }

    await markEventProcessed(eventId, true);
    return { success: true, message: 'Payment processed' };
  } catch (error: any) {
    console.error('Error processing payment.captured:', error);
    await markEventProcessed(eventId, false, error.message);
    throw error;
  }
}

/**
 * Handle payment.failed event
 */
export async function handlePaymentFailed(event: WebhookEvent) {
  const eventId = `${event.event}_${event.payload.payment?.entity.id}`;

  console.log(`🔔 Webhook: payment.failed - ${eventId}`);

  if (await isEventProcessed(eventId)) {
    return { success: true, message: 'Already processed' };
  }

  await logWebhookEvent(eventId, event.event, event.payload);

  try {
    const payment = event.payload.payment?.entity;
    if (!payment) throw new Error('No payment data in webhook');

    // Update payment record
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'failed',
        error_code: payment.error_code,
        error_description: payment.error_description,
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', payment.order_id);

    await markEventProcessed(eventId, true);
    return { success: true, message: 'Payment failure recorded' };
  } catch (error: any) {
    console.error('Error processing payment.failed:', error);
    await markEventProcessed(eventId, false, error.message);
    throw error;
  }
}

/**
 * Handle subscription.activated event
 */
export async function handleSubscriptionActivated(event: WebhookEvent) {
  const eventId = `${event.event}_${event.payload.subscription?.entity.id}`;

  console.log(`🔔 Webhook: subscription.activated - ${eventId}`);

  if (await isEventProcessed(eventId)) {
    return { success: true, message: 'Already processed' };
  }

  await logWebhookEvent(eventId, event.event, event.payload);

  try {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) throw new Error('No subscription data in webhook');

    // Update subscription record
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        razorpay_subscription_id: subscription.id,
        current_period_start: new Date(subscription.start_at * 1000).toISOString(),
        current_period_end: new Date(subscription.end_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_subscription_id', subscription.id);

    await markEventProcessed(eventId, true);
    return { success: true, message: 'Subscription activated' };
  } catch (error: any) {
    console.error('Error processing subscription.activated:', error);
    await markEventProcessed(eventId, false, error.message);
    throw error;
  }
}

/**
 * Handle subscription.cancelled event
 */
export async function handleSubscriptionCancelled(event: WebhookEvent) {
  const eventId = `${event.event}_${event.payload.subscription?.entity.id}`;

  console.log(`🔔 Webhook: subscription.cancelled - ${eventId}`);

  if (await isEventProcessed(eventId)) {
    return { success: true, message: 'Already processed' };
  }

  await logWebhookEvent(eventId, event.event, event.payload);

  try {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) throw new Error('No subscription data in webhook');

    // Update subscription record
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_subscription_id', subscription.id)
      .select()
      .single();

    if (error) throw error;

    // Queue cancellation email
    if (data) {
      await queueEmail(data.user_id, 'subscription_cancelled', {
        subscription_id: data.id,
      });
    }

    await markEventProcessed(eventId, true);
    return { success: true, message: 'Subscription cancelled' };
  } catch (error: any) {
    console.error('Error processing subscription.cancelled:', error);
    await markEventProcessed(eventId, false, error.message);
    throw error;
  }
}

/**
 * Queue email for sending
 */
async function queueEmail(userId: string, templateType: string, templateData: any) {
  // Get user email
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (!user?.user?.email) {
    console.warn(`No email found for user ${userId}`);
    return;
  }

  const { error } = await supabaseAdmin
    .from('email_queue')
    .insert({
      user_id: userId,
      email: user.user.email,
      template_type: templateType,
      template_data: templateData,
      status: 'pending',
    });

  if (error) {
    console.error('Failed to queue email:', error);
  } else {
    console.log(`✉️ Email queued: ${templateType} to ${user.user.email}`);
  }
}

/**
 * Route webhook event to appropriate handler
 */
export async function handleWebhook(event: WebhookEvent) {
  console.log(`📨 Processing webhook: ${event.event}`);

  switch (event.event) {
    case 'payment.captured':
      return await handlePaymentCaptured(event);

    case 'payment.failed':
      return await handlePaymentFailed(event);

    case 'subscription.activated':
      return await handleSubscriptionActivated(event);

    case 'subscription.cancelled':
      return await handleSubscriptionCancelled(event);

    default:
      console.log(`⚠️ Unhandled webhook event: ${event.event}`);
      return { success: false, message: `Unhandled event: ${event.event}` };
  }
}
