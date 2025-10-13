/**
 * External Resource Guide System
 * Provides universal guidance for integrating third-party services
 * Tells users where to get API keys, how to configure them, and what they're for
 */

export interface SecretKey {
  name: string; // Environment variable name
  type: 'secret' | 'publishable' | 'public';
  displayName: string; // User-friendly name
  location: string; // Where to find it in the provider's dashboard
  example?: string; // Example format (partially masked)
  testMode?: boolean; // Whether test/sandbox keys are available
}

export interface ExternalResource {
  id: string; // Unique identifier
  name: string; // Display name
  category: 'payment' | 'storage' | 'email' | 'sms' | 'ai' | 'analytics' | 'database' | 'auth' | 'other';
  description: string; // What it does
  purpose: string; // Why it's needed for this project
  
  // Signup & Setup
  signupUrl: string; // Where to create an account
  dashboardUrl: string; // Where to manage account
  docsUrl: string; // Documentation
  pricingUrl?: string; // Pricing page
  freeTier: boolean; // Has free tier/trial
  estimatedSetupTime: string; // e.g., "2 minutes", "5 minutes"
  
  // Required secrets
  secrets: SecretKey[];
  
  // Setup instructions
  setupSteps: string[];
  
  // Testing guidance
  testingNotes?: string;
  
  // Common issues
  commonIssues?: Array<{
    issue: string;
    solution: string;
  }>;
}

/**
 * Comprehensive database of external resources
 */
export const EXTERNAL_RESOURCES: Record<string, ExternalResource> = {
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    category: 'payment',
    description: 'Payment processing and subscription management',
    purpose: 'Handle payments, subscriptions, and billing',
    signupUrl: 'https://dashboard.stripe.com/register',
    dashboardUrl: 'https://dashboard.stripe.com',
    docsUrl: 'https://stripe.com/docs',
    pricingUrl: 'https://stripe.com/pricing',
    freeTier: true,
    estimatedSetupTime: '3 minutes',
    secrets: [
      {
        name: 'STRIPE_SECRET_KEY',
        type: 'secret',
        displayName: 'Secret Key',
        location: 'Dashboard → Developers → API keys → Secret key',
        example: 'sk_test_51...',
        testMode: true
      },
      {
        name: 'STRIPE_PUBLISHABLE_KEY',
        type: 'publishable',
        displayName: 'Publishable Key',
        location: 'Dashboard → Developers → API keys → Publishable key',
        example: 'pk_test_51...',
        testMode: true
      }
    ],
    setupSteps: [
      'Sign up at dashboard.stripe.com',
      'Verify your email address',
      'Enable "Test mode" toggle (top right)',
      'Go to Developers → API keys',
      'Copy both Secret key (starts with sk_test_) and Publishable key (starts with pk_test_)',
      'For production: Complete account verification and use Live mode keys'
    ],
    testingNotes: 'Use test mode keys (sk_test_...) for development. Test cards: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (decline)',
    commonIssues: [
      {
        issue: 'API key not working',
        solution: 'Ensure you\'re using the correct mode (test vs live) and the key matches the environment'
      },
      {
        issue: 'Webhook not receiving events',
        solution: 'Add your site URL to webhook endpoints in Dashboard → Developers → Webhooks'
      }
    ]
  },
  
  openai: {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai',
    description: 'AI models for chat, completion, and embeddings',
    purpose: 'Power AI features like chatbots, content generation, and text analysis',
    signupUrl: 'https://platform.openai.com/signup',
    dashboardUrl: 'https://platform.openai.com',
    docsUrl: 'https://platform.openai.com/docs',
    pricingUrl: 'https://openai.com/pricing',
    freeTier: true,
    estimatedSetupTime: '2 minutes',
    secrets: [
      {
        name: 'OPENAI_API_KEY',
        type: 'secret',
        displayName: 'API Key',
        location: 'Dashboard → API keys → Create new secret key',
        example: 'sk-proj-...',
        testMode: false
      }
    ],
    setupSteps: [
      'Sign up at platform.openai.com',
      'Verify your email and phone number',
      'Add billing information (required for API access)',
      'Go to API keys section',
      'Click "Create new secret key"',
      'Copy the key immediately (shown only once)',
      'Set usage limits under Billing → Usage limits to prevent unexpected charges'
    ],
    testingNotes: 'Start with gpt-4o-mini for cost-effective testing. Monitor usage at platform.openai.com/usage',
    commonIssues: [
      {
        issue: 'API key invalid',
        solution: 'Regenerate the key if lost. Keys are shown only once during creation'
      },
      {
        issue: 'Rate limit exceeded',
        solution: 'Upgrade your account tier or implement request throttling'
      }
    ]
  },
  
  aws: {
    id: 'aws',
    name: 'AWS (Amazon Web Services)',
    category: 'storage',
    description: 'Cloud storage (S3), computing, and other services',
    purpose: 'Store files, images, videos, and backups in the cloud',
    signupUrl: 'https://portal.aws.amazon.com/billing/signup',
    dashboardUrl: 'https://console.aws.amazon.com',
    docsUrl: 'https://docs.aws.amazon.com',
    pricingUrl: 'https://aws.amazon.com/pricing',
    freeTier: true,
    estimatedSetupTime: '10 minutes',
    secrets: [
      {
        name: 'AWS_ACCESS_KEY_ID',
        type: 'public',
        displayName: 'Access Key ID',
        location: 'IAM → Users → Security credentials → Create access key',
        example: 'AKIA...'
      },
      {
        name: 'AWS_SECRET_ACCESS_KEY',
        type: 'secret',
        displayName: 'Secret Access Key',
        location: 'Shown only during access key creation',
        example: 'wJalrXUtnFEMI/...'
      },
      {
        name: 'AWS_REGION',
        type: 'public',
        displayName: 'Region',
        location: 'Choose closest to your users (e.g., us-east-1, eu-west-1)',
        example: 'us-east-1'
      }
    ],
    setupSteps: [
      'Sign up at aws.amazon.com',
      'Verify email and add billing info (free tier available)',
      'Go to IAM service',
      'Create a new user with programmatic access',
      'Attach policy: AmazonS3FullAccess (or create custom policy)',
      'Create access key',
      'Save both Access Key ID and Secret Access Key immediately',
      'Choose AWS region closest to your users'
    ],
    testingNotes: 'Use S3 free tier: 5 GB storage, 20,000 GET requests/month for 12 months',
    commonIssues: [
      {
        issue: 'Access denied',
        solution: 'Check IAM user permissions and bucket policies'
      },
      {
        issue: 'Lost secret key',
        solution: 'Create new access key and deactivate/delete old one'
      }
    ]
  },
  
  sendgrid: {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'email',
    description: 'Transactional and marketing email service',
    purpose: 'Send emails for notifications, confirmations, and marketing',
    signupUrl: 'https://signup.sendgrid.com',
    dashboardUrl: 'https://app.sendgrid.com',
    docsUrl: 'https://docs.sendgrid.com',
    pricingUrl: 'https://sendgrid.com/pricing',
    freeTier: true,
    estimatedSetupTime: '5 minutes',
    secrets: [
      {
        name: 'SENDGRID_API_KEY',
        type: 'secret',
        displayName: 'API Key',
        location: 'Settings → API Keys → Create API Key',
        example: 'SG...'
      }
    ],
    setupSteps: [
      'Sign up at sendgrid.com',
      'Verify your email address',
      'Complete sender authentication (verify domain or single sender)',
      'Go to Settings → API Keys',
      'Click "Create API Key"',
      'Choose "Full Access" or restricted access',
      'Copy the key immediately (shown only once)',
      'Start with 100 free emails/day'
    ],
    testingNotes: 'Free tier includes 100 emails/day forever. Test with your own email first',
    commonIssues: [
      {
        issue: 'Emails not sending',
        solution: 'Complete sender authentication first'
      },
      {
        issue: 'Emails in spam',
        solution: 'Verify domain with SPF and DKIM records'
      }
    ]
  },
  
  twilio: {
    id: 'twilio',
    name: 'Twilio',
    category: 'sms',
    description: 'SMS, voice calls, and messaging platform',
    purpose: 'Send SMS notifications, 2FA codes, and voice calls',
    signupUrl: 'https://www.twilio.com/try-twilio',
    dashboardUrl: 'https://console.twilio.com',
    docsUrl: 'https://www.twilio.com/docs',
    pricingUrl: 'https://www.twilio.com/pricing',
    freeTier: true,
    estimatedSetupTime: '5 minutes',
    secrets: [
      {
        name: 'TWILIO_ACCOUNT_SID',
        type: 'public',
        displayName: 'Account SID',
        location: 'Console Dashboard → Account Info',
        example: 'AC...'
      },
      {
        name: 'TWILIO_AUTH_TOKEN',
        type: 'secret',
        displayName: 'Auth Token',
        location: 'Console Dashboard → Account Info → Auth Token',
        example: 'hidden by default'
      },
      {
        name: 'TWILIO_PHONE_NUMBER',
        type: 'public',
        displayName: 'Phone Number',
        location: 'Phone Numbers → Manage → Active Numbers',
        example: '+1234567890'
      }
    ],
    setupSteps: [
      'Sign up at twilio.com/try-twilio',
      'Verify your email and phone number',
      'Get $15 trial credit (no credit card required)',
      'Go to Console Dashboard',
      'Copy Account SID and Auth Token',
      'Get a phone number: Phone Numbers → Buy a number',
      'For production: Add billing info to remove trial restrictions'
    ],
    testingNotes: 'Trial account can only send to verified numbers. Add test numbers in Phone Numbers → Verified Caller IDs',
    commonIssues: [
      {
        issue: 'SMS not sending',
        solution: 'Verify recipient number is added to Verified Caller IDs (trial accounts)'
      },
      {
        issue: 'Invalid number format',
        solution: 'Use E.164 format: +[country code][number] (e.g., +14155551234)'
      }
    ]
  },
  
  cloudinary: {
    id: 'cloudinary',
    name: 'Cloudinary',
    category: 'storage',
    description: 'Image and video management platform',
    purpose: 'Upload, transform, optimize, and deliver images/videos',
    signupUrl: 'https://cloudinary.com/users/register/free',
    dashboardUrl: 'https://cloudinary.com/console',
    docsUrl: 'https://cloudinary.com/documentation',
    pricingUrl: 'https://cloudinary.com/pricing',
    freeTier: true,
    estimatedSetupTime: '2 minutes',
    secrets: [
      {
        name: 'CLOUDINARY_CLOUD_NAME',
        type: 'public',
        displayName: 'Cloud Name',
        location: 'Dashboard → Account Details',
        example: 'your-cloud-name'
      },
      {
        name: 'CLOUDINARY_API_KEY',
        type: 'public',
        displayName: 'API Key',
        location: 'Dashboard → Account Details',
        example: '123456789012345'
      },
      {
        name: 'CLOUDINARY_API_SECRET',
        type: 'secret',
        displayName: 'API Secret',
        location: 'Dashboard → Account Details',
        example: 'hidden by default'
      }
    ],
    setupSteps: [
      'Sign up at cloudinary.com',
      'Verify your email',
      'Go to Dashboard',
      'Find credentials in Account Details section',
      'Copy Cloud Name, API Key, and API Secret',
      'Free tier: 25 credits/month (about 25GB storage & 25GB bandwidth)'
    ],
    testingNotes: 'Test uploads in Media Library. Use transformations in URL for optimization',
    commonIssues: [
      {
        issue: 'Upload failed',
        solution: 'Check file size limits and format support'
      },
      {
        issue: 'Images not loading',
        solution: 'Verify cloud name and URL format'
      }
    ]
  },

  gemini: {
    id: 'gemini',
    name: 'Google Gemini AI',
    category: 'ai',
    description: 'Google\'s AI model for chat, vision, and reasoning',
    purpose: 'Power AI features with Google\'s latest models',
    signupUrl: 'https://makersuite.google.com/app/apikey',
    dashboardUrl: 'https://makersuite.google.com',
    docsUrl: 'https://ai.google.dev/docs',
    pricingUrl: 'https://ai.google.dev/pricing',
    freeTier: true,
    estimatedSetupTime: '2 minutes',
    secrets: [
      {
        name: 'GEMINI_API_KEY',
        type: 'secret',
        displayName: 'API Key',
        location: 'Get API Key → Create API key',
        example: 'AIza...',
        testMode: false
      }
    ],
    setupSteps: [
      'Go to makersuite.google.com',
      'Sign in with Google account',
      'Click "Get API Key"',
      'Create API key for your project',
      'Copy the key immediately',
      'Free tier: 60 requests/minute for Gemini Pro'
    ],
    testingNotes: 'Free tier is generous. Start with gemini-pro model',
    commonIssues: [
      {
        issue: 'API quota exceeded',
        solution: 'Wait for quota reset or upgrade to paid tier'
      }
    ]
  }
};

/**
 * Get resource by ID
 */
export function getResource(id: string): ExternalResource | null {
  return EXTERNAL_RESOURCES[id] || null;
}

/**
 * Get resources by category
 */
export function getResourcesByCategory(category: string): ExternalResource[] {
  return Object.values(EXTERNAL_RESOURCES).filter(r => r.category === category);
}

/**
 * Detect required resources from user request and features
 */
export function detectRequiredResources(
  userRequest: string,
  features: string[],
  backendRequirements?: any
): ExternalResource[] {
  const required: ExternalResource[] = [];
  const requestLower = userRequest.toLowerCase();
  
  // Payment detection
  if (
    requestLower.includes('payment') ||
    requestLower.includes('stripe') ||
    requestLower.includes('checkout') ||
    requestLower.includes('subscription') ||
    requestLower.includes('billing') ||
    features.includes('payments')
  ) {
    const stripe = getResource('stripe');
    if (stripe) required.push(stripe);
  }
  
  // AI detection
  if (
    requestLower.includes('ai') ||
    requestLower.includes('chatbot') ||
    requestLower.includes('chat gpt') ||
    requestLower.includes('openai') ||
    requestLower.includes('gpt') ||
    features.includes('ai')
  ) {
    // Check if using Lovable AI (no key needed) or external
    if (!requestLower.includes('lovable ai')) {
      const openai = getResource('openai');
      if (openai) required.push(openai);
    }
  }
  
  // Google AI detection
  if (
    requestLower.includes('gemini') ||
    requestLower.includes('google ai') ||
    requestLower.includes('bard')
  ) {
    const gemini = getResource('gemini');
    if (gemini) required.push(gemini);
  }
  
  // Storage detection (AWS S3)
  if (
    requestLower.includes('aws') ||
    requestLower.includes('s3') ||
    requestLower.includes('cloud storage') ||
    (requestLower.includes('file') && requestLower.includes('upload') && !requestLower.includes('supabase'))
  ) {
    const aws = getResource('aws');
    if (aws) required.push(aws);
  }
  
  // Image/Video storage (Cloudinary)
  if (
    requestLower.includes('cloudinary') ||
    requestLower.includes('image upload') ||
    requestLower.includes('video upload') ||
    requestLower.includes('image transformation') ||
    features.includes('videoUpload')
  ) {
    const cloudinary = getResource('cloudinary');
    if (cloudinary) required.push(cloudinary);
  }
  
  // Email detection
  if (
    requestLower.includes('email') ||
    requestLower.includes('sendgrid') ||
    requestLower.includes('send mail') ||
    features.includes('email')
  ) {
    const sendgrid = getResource('sendgrid');
    if (sendgrid) required.push(sendgrid);
  }
  
  // SMS detection
  if (
    requestLower.includes('sms') ||
    requestLower.includes('text message') ||
    requestLower.includes('twilio') ||
    requestLower.includes('phone') ||
    features.includes('sms')
  ) {
    const twilio = getResource('twilio');
    if (twilio) required.push(twilio);
  }
  
  return required;
}

/**
 * Check if secrets are already configured
 */
export async function checkConfiguredSecrets(
  resources: ExternalResource[]
): Promise<Map<string, boolean>> {
  const configured = new Map<string, boolean>();
  
  for (const resource of resources) {
    // Check if ALL required secrets for this resource are configured
    const allConfigured = resource.secrets.every(secret => {
      const value = Deno.env.get(secret.name);
      return value !== undefined && value !== '';
    });
    
    configured.set(resource.id, allConfigured);
  }
  
  return configured;
}

/**
 * Generate user-friendly setup message
 */
export function generateSetupMessage(resource: ExternalResource): string {
  return `
### ${resource.name} Setup Required

**What it does:** ${resource.description}
**Why you need it:** ${resource.purpose}
**Setup time:** ~${resource.estimatedSetupTime}
**Free tier:** ${resource.freeTier ? '✅ Yes' : '❌ No'}

**Quick Setup Steps:**
${resource.setupSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Required credentials:**
${resource.secrets.map(secret => 
  `- **${secret.displayName}** (${secret.type === 'secret' ? '🔒 Secret' : '🔓 Public'})
  - Find at: ${secret.location}
  ${secret.example ? `- Example: \`${secret.example}\`` : ''}`
).join('\n')}

${resource.testingNotes ? `\n**Testing:** ${resource.testingNotes}` : ''}

**Helpful Links:**
- 📝 [Sign up](${resource.signupUrl})
- 📊 [Dashboard](${resource.dashboardUrl})
- 📚 [Documentation](${resource.docsUrl})
${resource.pricingUrl ? `- 💰 [Pricing](${resource.pricingUrl})` : ''}
  `.trim();
}
