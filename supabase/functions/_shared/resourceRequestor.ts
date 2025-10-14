/**
 * RESOURCE REQUESTOR
 * Manages requesting resources (API keys, credentials, etc.) from users
 * Creates database records for UI to display prompts
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ResourceRequest {
  type: 'api_key' | 'database' | 'credentials' | 'external_service';
  name: string;
  description: string;
  required: boolean;
  example?: string;
  documentation?: string;
}

export interface RequestedResource {
  id: string;
  name: string;
  value?: string;
  status: 'pending' | 'provided' | 'skipped';
  requestedAt: string;
}

/**
 * Create resource request that UI can display
 */
export async function requestResource(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  resource: ResourceRequest
): Promise<string> {
  
  console.log(`📋 Requesting resource: ${resource.name}`);

  // Create request in database
  const { data, error } = await supabase
    .from('resource_requests')
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      resource_type: resource.type,
      resource_name: resource.name,
      description: resource.description,
      required: resource.required,
      example: resource.example,
      documentation_url: resource.documentation,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create resource request:', error);
    throw new Error(`Failed to request ${resource.name}: ${error.message}`);
  }

  console.log(`✅ Resource request created: ${data.id}`);
  return data.id;
}

/**
 * Wait for user to provide resource using realtime subscriptions (no polling)
 */
export async function waitForResource(
  supabase: SupabaseClient,
  requestId: string,
  timeoutMs: number = 300000 // 5 minutes default
): Promise<string | null> {
  
  console.log(`⏳ Waiting for resource: ${requestId}`);

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.log(`⏱️ Resource request timed out: ${requestId}`);
      channel.unsubscribe();
      resolve(null);
    }, timeoutMs);

    // Subscribe to realtime changes instead of polling
    const channel = supabase
      .channel(`resource_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'resource_requests',
          filter: `id=eq.${requestId}`
        },
        (payload: any) => {
          const newData = payload.new;
          
          if (newData.status === 'provided' && newData.value) {
            console.log(`✅ Resource provided: ${requestId}`);
            clearTimeout(timeoutId);
            channel.unsubscribe();
            resolve(newData.value);
          } else if (newData.status === 'skipped') {
            console.log(`⏭️ Resource skipped: ${requestId}`);
            clearTimeout(timeoutId);
            channel.unsubscribe();
            resolve(null);
          }
        }
      )
      .subscribe();
  });
}

/**
 * Request multiple resources in parallel
 */
export async function requestMultipleResources(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  resources: ResourceRequest[]
): Promise<Map<string, string>> {
  
  console.log(`📋 Requesting ${resources.length} resources`);

  // Create all requests
  const requestIds = await Promise.all(
    resources.map(r => requestResource(supabase, userId, conversationId, r))
  );

  // Wait for all responses (in parallel)
  const values = await Promise.all(
    requestIds.map(id => waitForResource(supabase, id))
  );

  // Build map of provided resources
  const resourceMap = new Map<string, string>();
  resources.forEach((resource, i) => {
    const value = values[i];
    if (value) {
      resourceMap.set(resource.name, value);
    }
  });

  console.log(`✅ Received ${resourceMap.size}/${resources.length} resources`);
  return resourceMap;
}

/**
 * Detect needed resources from request
 */
export function detectRequiredResources(request: string): ResourceRequest[] {
  const resources: ResourceRequest[] = [];

  // Stripe payment integration
  if (/\b(payment|stripe|checkout|billing|subscription)\b/i.test(request)) {
    resources.push({
      type: 'api_key',
      name: 'STRIPE_SECRET_KEY',
      description: 'Stripe secret key for payment processing',
      required: true,
      example: 'sk_test_...',
      documentation: 'https://stripe.com/docs/keys'
    });
  }

  // OpenAI API
  if (/\b(openai|gpt|chat|ai assistant)\b/i.test(request)) {
    resources.push({
      type: 'api_key',
      name: 'OPENAI_API_KEY',
      description: 'OpenAI API key for AI features',
      required: true,
      example: 'sk-...',
      documentation: 'https://platform.openai.com/api-keys'
    });
  }

  // AWS / S3
  if (/\b(aws|s3|file upload|storage)\b/i.test(request)) {
    resources.push({
      type: 'credentials',
      name: 'AWS_CREDENTIALS',
      description: 'AWS access key and secret for S3 storage',
      required: true,
      example: 'Access Key ID, Secret Access Key',
      documentation: 'https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html'
    });
  }

  // SendGrid email
  if (/\b(email|sendgrid|smtp)\b/i.test(request)) {
    resources.push({
      type: 'api_key',
      name: 'SENDGRID_API_KEY',
      description: 'SendGrid API key for sending emails',
      required: true,
      example: 'SG...',
      documentation: 'https://sendgrid.com/docs/ui/account-and-settings/api-keys/'
    });
  }

  // Twilio SMS
  if (/\b(sms|twilio|text message)\b/i.test(request)) {
    resources.push({
      type: 'credentials',
      name: 'TWILIO_CREDENTIALS',
      description: 'Twilio Account SID and Auth Token',
      required: true,
      example: 'Account SID, Auth Token',
      documentation: 'https://www.twilio.com/docs/iam/credentials/api-key'
    });
  }

  return resources;
}
