import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Analyze component dependencies from code
function analyzeComponents(code: string) {
  const components: any[] = [];
  
  // Extract React components
  const componentRegex = /(?:function|const)\s+([A-Z]\w+)\s*(?:=\s*)?(?:\([^)]*\))?\s*(?:=>)?\s*\{/g;
  let match;
  
  while ((match = componentRegex.exec(code)) !== null) {
    const componentName = match[1];
    const componentStart = match.index;
    
    // Find component end (simplified - look for closing brace)
    let braceCount = 1;
    let i = componentStart + match[0].length;
    while (i < code.length && braceCount > 0) {
      if (code[i] === '{') braceCount++;
      if (code[i] === '}') braceCount--;
      i++;
    }
    
    const componentCode = code.substring(componentStart, i);
    
    // Analyze dependencies
    const imports = componentCode.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g) || [];
    const usedComponents = componentCode.match(/<([A-Z]\w+)/g)?.map(c => c.substring(1)) || [];
    const hooks = componentCode.match(/use[A-Z]\w+/g) || [];
    const apiCalls = componentCode.match(/fetch\(|axios\./g) || [];
    
    // Calculate complexity
    const lines = componentCode.split('\n').length;
    const logicComplexity = (componentCode.match(/if|else|switch|for|while/g) || []).length;
    const stateCount = (componentCode.match(/useState|useReducer/g) || []).length;
    
    let complexityScore = 0;
    if (lines > 50) complexityScore += 3;
    else if (lines > 20) complexityScore += 2;
    else complexityScore += 1;
    
    complexityScore += logicComplexity;
    complexityScore += stateCount * 2;
    
    // Determine criticality
    let criticality = 'low';
    if (apiCalls.length > 0 || stateCount > 3) criticality = 'high';
    else if (usedComponents.length > 3 || logicComplexity > 5) criticality = 'medium';
    
    components.push({
      name: componentName,
      type: 'react-component',
      dependsOn: [...new Set([...usedComponents, ...hooks])],
      usedBy: [], // Will be populated later
      imports: imports.map(imp => imp.match(/from\s+['"]([^'"]+)['"]/)?.[1] || ''),
      complexityScore,
      criticality,
      metadata: {
        lines,
        hasAPI: apiCalls.length > 0,
        stateCount,
        hooksUsed: hooks
      }
    });
  }
  
  // Build reverse dependencies (usedBy)
  components.forEach(comp => {
    comp.dependsOn.forEach((dep: string) => {
      const depComponent = components.find(c => c.name === dep);
      if (depComponent) {
        depComponent.usedBy.push(comp.name);
      }
    });
  });
  
  return components;
}

// Build dependency graph
function buildDependencyGraph(components: any[]) {
  const graph: any = {
    nodes: components.map(c => ({
      id: c.name,
      type: c.type,
      complexity: c.complexityScore,
      criticality: c.criticality
    })),
    edges: []
  };
  
  components.forEach(comp => {
    comp.dependsOn.forEach((dep: string) => {
      if (components.find(c => c.name === dep)) {
        graph.edges.push({
          from: comp.name,
          to: dep,
          type: 'dependency'
        });
      }
    });
  });
  
  return graph;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, conversationId, code, componentName } = await req.json();
    
    console.log('🔍 Component awareness:', { action, conversationId });

    if (action === 'analyze') {
      // Analyze and store component dependencies
      if (!code || !conversationId) {
        throw new Error('code and conversationId required');
      }

      const components = analyzeComponents(code);
      console.log(`📊 Analyzed ${components.length} components`);

      // Store components in database
      for (const comp of components) {
        await supabase
          .from('component_dependencies')
          .upsert({
            conversation_id: conversationId,
            component_name: comp.name,
            component_type: comp.type,
            depends_on: comp.dependsOn,
            used_by: comp.usedBy,
            complexity_score: comp.complexityScore,
            criticality: comp.criticality,
            last_modified_at: new Date().toISOString()
          }, {
            onConflict: 'conversation_id,component_name'
          });
      }

      const graph = buildDependencyGraph(components);

      return new Response(
        JSON.stringify({
          success: true,
          components,
          graph,
          summary: {
            totalComponents: components.length,
            byCriticality: {
              high: components.filter(c => c.criticality === 'high').length,
              medium: components.filter(c => c.criticality === 'medium').length,
              low: components.filter(c => c.criticality === 'low').length
            },
            avgComplexity: components.reduce((sum, c) => sum + c.complexityScore, 0) / components.length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-dependencies') {
      // Get component dependencies for modification planning
      if (!conversationId) {
        throw new Error('conversationId required');
      }

      const { data: components } = await supabase
        .from('component_dependencies')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('criticality', { ascending: false });

      const graph = buildDependencyGraph(components || []);

      return new Response(
        JSON.stringify({
          success: true,
          components: components || [],
          graph
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'impact-analysis') {
      // Analyze impact of changing a specific component
      if (!conversationId || !componentName) {
        throw new Error('conversationId and componentName required');
      }

      const { data: allComponents } = await supabase
        .from('component_dependencies')
        .select('*')
        .eq('conversation_id', conversationId);

      if (!allComponents) {
        throw new Error('No components found');
      }

      const targetComponent = allComponents.find(c => c.component_name === componentName);
      if (!targetComponent) {
        throw new Error('Component not found');
      }

      // Find all components that depend on this one (direct and indirect)
      const affectedComponents = new Set<string>();
      const queue = [componentName];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        const component = allComponents.find(c => c.component_name === current);
        
        if (component && component.used_by) {
          component.used_by.forEach((dependent: string) => {
            if (!affectedComponents.has(dependent)) {
              affectedComponents.add(dependent);
              queue.push(dependent);
            }
          });
        }
      }

      const impactedComponents = Array.from(affectedComponents).map(name => 
        allComponents.find(c => c.component_name === name)
      ).filter(Boolean);

      const highCriticalityImpact = impactedComponents.filter(c => c.criticality === 'high').length;

      return new Response(
        JSON.stringify({
          success: true,
          targetComponent: componentName,
          directDependents: targetComponent.used_by || [],
          totalImpactedComponents: affectedComponents.size,
          impactedComponents: impactedComponents.map(c => ({
            name: c.component_name,
            criticality: c.criticality,
            complexity: c.complexity_score
          })),
          riskLevel: highCriticalityImpact > 0 ? 'high' : 
                     affectedComponents.size > 5 ? 'medium' : 'low',
          recommendation: highCriticalityImpact > 0 
            ? 'High risk: This affects critical components. Test thoroughly.'
            : affectedComponents.size > 5
            ? 'Medium risk: Multiple components affected. Review carefully.'
            : 'Low risk: Limited impact. Safe to modify.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action. Use: analyze, get-dependencies, or impact-analysis');

  } catch (error: any) {
    console.error('💥 Error in component awareness:', error);
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