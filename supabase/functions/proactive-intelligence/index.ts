import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, filePath, projectId } = await req.json();

    if (!code) {
      throw new Error('Code is required');
    }

    // Analyze code for various issues
    const suggestions = [];

    // Security checks
    if (code.includes('eval(') || code.includes('Function(')) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'security',
        severity: 'critical',
        title: 'Dangerous eval() usage detected',
        description: 'Using eval() or Function() constructor can lead to code injection vulnerabilities',
        code: code.match(/eval\(.*?\)/)?.[0] || 'eval(...)',
        fix: 'Use safer alternatives like JSON.parse() or specific parsing functions',
        impact: 'High security risk',
        automated: true
      });
    }

    if (code.includes('innerHTML') && !code.includes('DOMPurify')) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'security',
        severity: 'high',
        title: 'XSS vulnerability with innerHTML',
        description: 'Using innerHTML without sanitization can lead to XSS attacks',
        impact: 'Security vulnerability',
        automated: false
      });
    }

    // Performance checks
    if (code.match(/for\s*\(.*\)\s*{[\s\S]*?for\s*\(/)) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'performance',
        severity: 'medium',
        title: 'Nested loops detected',
        description: 'Nested loops can lead to O(n²) or worse time complexity',
        impact: 'Performance degradation with large datasets',
        automated: false
      });
    }

    if (code.includes('document.querySelector') && code.split('document.querySelector').length > 3) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'performance',
        severity: 'low',
        title: 'Multiple DOM queries',
        description: 'Repeated DOM queries in same scope can be cached',
        impact: 'Minor performance improvement',
        automated: false
      });
    }

    // Best practices
    if (code.includes('var ')) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'best-practice',
        severity: 'low',
        title: 'Use const/let instead of var',
        description: 'var has function scope and can lead to unexpected behavior',
        impact: 'Code clarity and safety',
        automated: true,
        fix: code.replace(/var /g, 'const ')
      });
    }

    if (code.includes('console.log') && !code.includes('// TODO')) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'best-practice',
        severity: 'low',
        title: 'Remove console.log statements',
        description: 'Console logs should be removed or replaced with proper logging in production',
        impact: 'Code cleanliness',
        automated: true
      });
    }

    // React-specific checks
    if (code.includes('useState') && code.includes('useEffect')) {
      const useEffectCount = (code.match(/useEffect/g) || []).length;
      if (useEffectCount > 3) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'optimization',
          severity: 'medium',
          title: 'Multiple useEffect hooks',
          description: `Found ${useEffectCount} useEffect hooks. Consider consolidating related effects`,
          impact: 'Component organization and performance',
          automated: false
        });
      }
    }

    if (code.includes('map((') && !code.includes('key=')) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'best-practice',
        severity: 'high',
        title: 'Missing key prop in list',
        description: 'React requires unique key props for list items',
        impact: 'React warnings and potential rendering issues',
        automated: false
      });
    }

    // TypeScript checks
    if (filePath?.endsWith('.ts') || filePath?.endsWith('.tsx')) {
      if (code.includes('any')) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'best-practice',
          severity: 'medium',
          title: 'Avoid using "any" type',
          description: 'Using "any" defeats the purpose of TypeScript type checking',
          impact: 'Type safety',
          automated: false
        });
      }
    }

    console.log(`Proactive analysis complete: ${suggestions.length} suggestions found`);

    return new Response(
      JSON.stringify({ 
        suggestions,
        summary: {
          total: suggestions.length,
          critical: suggestions.filter(s => s.severity === 'critical').length,
          automated: suggestions.filter(s => s.automated).length
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Proactive intelligence error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Analysis failed',
        suggestions: []
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
