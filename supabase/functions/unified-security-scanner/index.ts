import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified Security Scanner
 * Consolidates:
 * - security-scan (general security scanning)
 * - security-vulnerability-scanner (vulnerability detection)
 * - plugin-security-scanner (plugin/dependency security)
 */

interface SecurityRequest {
  action: 'scan' | 'vulnerability-check' | 'dependency-audit' | 'compliance-check';
  code?: string;
  dependencies?: Record<string, string>;
  framework?: string;
  scanDepth?: 'quick' | 'standard' | 'deep';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      code,
      dependencies,
      framework = 'react',
      scanDepth = 'standard'
    } = await req.json() as SecurityRequest;

    console.log('[unified-security-scanner] Action:', action, { framework, scanDepth });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    switch (action) {
      case 'scan': {
        if (!code) {
          throw new Error('Code required for security scan');
        }

        console.log('[scan] Performing security scan');

        const scanPrompt = `Perform a comprehensive security scan on this ${framework} code:

\`\`\`typescript
${code}
\`\`\`

Scan depth: ${scanDepth}

Check for:
1. XSS vulnerabilities
2. SQL injection risks
3. CSRF vulnerabilities
4. Insecure data storage
5. Authentication issues
6. Authorization flaws
7. Sensitive data exposure
8. Security misconfiguration
9. Known vulnerable components
10. Insufficient logging

Return JSON:
{
  "securityScore": <0-100>,
  "vulnerabilities": [
    {
      "id": "...",
      "type": "xss|injection|csrf|auth|data-exposure",
      "severity": "critical|high|medium|low|info",
      "title": "...",
      "description": "...",
      "location": "line X-Y",
      "cwe": "CWE-XXX",
      "recommendation": "...",
      "codeExample": "... fixed code ..."
    }
  ],
  "summary": {
    "critical": <count>,
    "high": <count>,
    "medium": <count>,
    "low": <count>
  },
  "recommendations": ["..."],
  "complianceStatus": {
    "owasp": "pass|fail",
    "gdpr": "compliant|issues"
  }
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are a security expert specializing in ${framework} applications. Identify all security vulnerabilities.`
              },
              {
                role: 'user',
                content: scanPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 4000,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const scanResults = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...scanResults,
            framework,
            scanDepth,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'vulnerability-check': {
        if (!code) {
          throw new Error('Code required for vulnerability check');
        }

        console.log('[vulnerability-check] Checking for known vulnerabilities');

        const vulnPrompt = `Check this code for known security vulnerabilities and CVEs:

\`\`\`typescript
${code}
\`\`\`

Focus on:
- Known CVE patterns
- OWASP Top 10 vulnerabilities
- Framework-specific issues
- Common attack vectors

Return JSON:
{
  "knownVulnerabilities": [
    {
      "cve": "CVE-YYYY-XXXX",
      "severity": "critical|high|medium|low",
      "description": "...",
      "affectedCode": "...",
      "patchAvailable": true/false,
      "recommendation": "..."
    }
  ],
  "riskLevel": "critical|high|medium|low",
  "exploitability": "easy|moderate|difficult",
  "immediateActions": ["..."]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a vulnerability assessment expert. Identify known security issues.'
              },
              {
                role: 'user',
                content: vulnPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3000,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const vulnResults = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...vulnResults,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'dependency-audit': {
        if (!dependencies || Object.keys(dependencies).length === 0) {
          throw new Error('Dependencies required for audit');
        }

        console.log('[dependency-audit] Auditing dependencies');

        const depsPrompt = `Audit these project dependencies for security issues:

${JSON.stringify(dependencies, null, 2)}

Check for:
- Known vulnerabilities (CVEs)
- Outdated packages
- Malicious packages
- License issues
- Dependency conflicts

Return JSON:
{
  "auditResults": [
    {
      "package": "...",
      "version": "...",
      "vulnerabilities": [
        {
          "severity": "critical|high|medium|low",
          "cve": "...",
          "description": "...",
          "fixedIn": "..."
        }
      ],
      "recommendation": "update|remove|keep",
      "alternativePackages": ["..."]
    }
  ],
  "overallRisk": "critical|high|medium|low",
  "packagesWithIssues": <count>,
  "updateRecommendations": ["..."],
  "securityScore": <0-100>
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a dependency security auditor. Identify vulnerable packages.'
              },
              {
                role: 'user',
                content: depsPrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3500,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const auditResults = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...auditResults,
            totalDependencies: Object.keys(dependencies).length,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'compliance-check': {
        if (!code) {
          throw new Error('Code required for compliance check');
        }

        console.log('[compliance-check] Checking security compliance');

        const compliancePrompt = `Check this code for security compliance standards:

\`\`\`typescript
${code}
\`\`\`

Verify compliance with:
- OWASP Top 10
- GDPR requirements
- PCI DSS (if handling payments)
- HIPAA (if handling health data)
- SOC 2

Return JSON:
{
  "complianceResults": {
    "owasp": {
      "compliant": true/false,
      "issues": ["..."],
      "score": <0-100>
    },
    "gdpr": {
      "compliant": true/false,
      "dataHandling": "appropriate|issues",
      "concerns": ["..."]
    },
    "general": {
      "dataEncryption": "yes|no|partial",
      "accessControl": "adequate|insufficient",
      "auditLogging": "present|missing"
    }
  },
  "recommendations": ["..."],
  "criticalIssues": ["..."]
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a security compliance expert. Verify adherence to security standards.'
              },
              {
                role: 'user',
                content: compliancePrompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 3000,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const complianceResults = JSON.parse(data.choices[0].message.content);

        return new Response(
          JSON.stringify({
            success: true,
            ...complianceResults,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[unified-security-scanner] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
