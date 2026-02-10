/**
 * ConvertKit Email Marketing Integration
 * Handles subscriber management, tagging, and email sequences
 */

const CONVERTKIT_API_URL = 'https://api.convertkit.com/v3';
const CONVERTKIT_API_KEY = process.env.CONVERTKIT_API_KEY;
const CONVERTKIT_API_SECRET = process.env.CONVERTKIT_API_SECRET;
const CONVERTKIT_FORM_ID = process.env.CONVERTKIT_FORM_ID;

// Tag IDs (configure these in ConvertKit dashboard)
const TAGS = {
  NEW_SIGNUP: process.env.CONVERTKIT_TAG_NEW_SIGNUP,
  TEACHER: process.env.CONVERTKIT_TAG_TEACHER,
  STUDENT: process.env.CONVERTKIT_TAG_STUDENT,
  GOOGLE_AUTH: process.env.CONVERTKIT_TAG_GOOGLE_AUTH,
  EMAIL_AUTH: process.env.CONVERTKIT_TAG_EMAIL_AUTH,
  PRO_SUBSCRIBER: process.env.CONVERTKIT_TAG_PRO_SUBSCRIBER,
  FIRST_SCAN_COMPLETE: process.env.CONVERTKIT_TAG_FIRST_SCAN_COMPLETE,
};

// Sequence ID for welcome emails
const WELCOME_SEQUENCE_ID = process.env.CONVERTKIT_WELCOME_SEQUENCE;

interface SubscribeOptions {
  email: string;
  firstName?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Subscribe a user to ConvertKit
 */
export async function subscribeUser(options: SubscribeOptions): Promise<{ success: boolean; subscriberId?: string; error?: string }> {
  if (!CONVERTKIT_API_KEY || !CONVERTKIT_FORM_ID) {
    console.warn('⚠️ ConvertKit not configured');
    return { success: false, error: 'ConvertKit not configured' };
  }

  try {
    const response = await fetch(`${CONVERTKIT_API_URL}/forms/${CONVERTKIT_FORM_ID}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: CONVERTKIT_API_KEY,
        email: options.email,
        first_name: options.firstName || '',
        fields: options.customFields || {},
        tags: options.tags || [],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ConvertKit subscribe error:', error);
      return { success: false, error };
    }

    const data = await response.json();
    console.log(`✅ Subscribed ${options.email} to ConvertKit`);

    return {
      success: true,
      subscriberId: data.subscription?.subscriber?.id,
    };
  } catch (error: any) {
    console.error('ConvertKit subscribe error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tag a subscriber
 */
export async function tagSubscriber(email: string, tagId: string): Promise<{ success: boolean; error?: string }> {
  if (!CONVERTKIT_API_SECRET) {
    console.warn('⚠️ ConvertKit API secret not configured');
    return { success: false, error: 'ConvertKit not configured' };
  }

  try {
    const response = await fetch(`${CONVERTKIT_API_URL}/tags/${tagId}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_secret: CONVERTKIT_API_SECRET,
        email,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ConvertKit tag error:', error);
      return { success: false, error };
    }

    console.log(`✅ Tagged ${email} with tag ${tagId}`);
    return { success: true };
  } catch (error: any) {
    console.error('ConvertKit tag error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add subscriber to a sequence
 */
export async function addToSequence(email: string, sequenceId: string): Promise<{ success: boolean; error?: string }> {
  if (!CONVERTKIT_API_SECRET) {
    console.warn('⚠️ ConvertKit API secret not configured');
    return { success: false, error: 'ConvertKit not configured' };
  }

  try {
    const response = await fetch(`${CONVERTKIT_API_URL}/sequences/${sequenceId}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_secret: CONVERTKIT_API_SECRET,
        email,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ConvertKit sequence error:', error);
      return { success: false, error };
    }

    console.log(`✅ Added ${email} to sequence ${sequenceId}`);
    return { success: true };
  } catch (error: any) {
    console.error('ConvertKit sequence error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unsubscribe a user
 */
export async function unsubscribeUser(email: string): Promise<{ success: boolean; error?: string }> {
  if (!CONVERTKIT_API_SECRET) {
    console.warn('⚠️ ConvertKit API secret not configured');
    return { success: false, error: 'ConvertKit not configured' };
  }

  try {
    const response = await fetch(`${CONVERTKIT_API_URL}/unsubscribe`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_secret: CONVERTKIT_API_SECRET,
        email,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ConvertKit unsubscribe error:', error);
      return { success: false, error };
    }

    console.log(`✅ Unsubscribed ${email} from ConvertKit`);
    return { success: true };
  } catch (error: any) {
    console.error('ConvertKit unsubscribe error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email sequence
 */
export async function sendWelcomeEmail(email: string, firstName?: string): Promise<{ success: boolean; error?: string }> {
  if (!WELCOME_SEQUENCE_ID) {
    console.warn('⚠️ Welcome sequence not configured');
    return { success: false, error: 'Welcome sequence not configured' };
  }

  // Subscribe and add to sequence
  const subscribeResult = await subscribeUser({ email, firstName });
  if (!subscribeResult.success) {
    return subscribeResult;
  }

  // Add to welcome sequence
  const sequenceResult = await addToSequence(email, WELCOME_SEQUENCE_ID);
  return sequenceResult;
}

/**
 * Tag user as new signup
 */
export async function tagNewSignup(email: string, authMethod: 'google' | 'email'): Promise<void> {
  // Tag as new signup
  if (TAGS.NEW_SIGNUP) {
    await tagSubscriber(email, TAGS.NEW_SIGNUP);
  }

  // Tag auth method
  if (authMethod === 'google' && TAGS.GOOGLE_AUTH) {
    await tagSubscriber(email, TAGS.GOOGLE_AUTH);
  } else if (authMethod === 'email' && TAGS.EMAIL_AUTH) {
    await tagSubscriber(email, TAGS.EMAIL_AUTH);
  }
}

/**
 * Tag user based on role
 */
export async function tagUserRole(email: string, role: 'teacher' | 'student'): Promise<void> {
  const tagId = role === 'teacher' ? TAGS.TEACHER : TAGS.STUDENT;

  if (tagId) {
    await tagSubscriber(email, tagId);
  }
}

/**
 * Tag user as Pro subscriber
 */
export async function tagProSubscriber(email: string): Promise<void> {
  if (TAGS.PRO_SUBSCRIBER) {
    await tagSubscriber(email, TAGS.PRO_SUBSCRIBER);
  }
}

/**
 * Tag user when they complete first scan
 */
export async function tagFirstScanComplete(email: string): Promise<void> {
  if (TAGS.FIRST_SCAN_COMPLETE) {
    await tagSubscriber(email, TAGS.FIRST_SCAN_COMPLETE);
  }
}

/**
 * Update subscriber preferences
 */
export async function updateSubscriberFields(email: string, fields: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  if (!CONVERTKIT_API_SECRET) {
    console.warn('⚠️ ConvertKit API secret not configured');
    return { success: false, error: 'ConvertKit not configured' };
  }

  try {
    // First, get subscriber ID
    const subscriberResponse = await fetch(
      `${CONVERTKIT_API_URL}/subscribers?api_secret=${CONVERTKIT_API_SECRET}&email_address=${encodeURIComponent(email)}`
    );

    if (!subscriberResponse.ok) {
      throw new Error('Failed to find subscriber');
    }

    const subscriberData = await subscriberResponse.json();
    const subscriberId = subscriberData.subscribers?.[0]?.id;

    if (!subscriberId) {
      throw new Error('Subscriber not found');
    }

    // Update fields
    const updateResponse = await fetch(`${CONVERTKIT_API_URL}/subscribers/${subscriberId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_secret: CONVERTKIT_API_SECRET,
        fields,
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('ConvertKit update error:', error);
      return { success: false, error };
    }

    console.log(`✅ Updated fields for ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error('ConvertKit update error:', error);
    return { success: false, error: error.message };
  }
}

// Export for server use
export default {
  subscribeUser,
  tagSubscriber,
  addToSequence,
  unsubscribeUser,
  sendWelcomeEmail,
  tagNewSignup,
  tagUserRole,
  tagProSubscriber,
  tagFirstScanComplete,
  updateSubscriberFields,
};
