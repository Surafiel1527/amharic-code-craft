import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Analyze code to extract coding preferences
function analyzeCodeStyle(code: string) {
  const style: any = {};
  
  // Detect indentation
  const lines = code.split('\n').filter(line => line.trim());
  const indentedLines = lines.filter(line => line.match(/^\s+/));
  if (indentedLines.length > 0) {
    const indents = indentedLines.map(line => {
      const match = line.match(/^(\s+)/);
      return match ? match[1].length : 0;
    });
    const commonIndent = indents.sort((a, b) => 
      indents.filter(v => v === a).length - indents.filter(v => v === b).length
    )[0];
    style.indentation = commonIndent === 4 ? '4-spaces' : 
                        commonIndent === 2 ? '2-spaces' : 'tab';
  }
  
  // Detect semicolons
  const statementsWithSemicolon = (code.match(/;$/gm) || []).length;
  const totalStatements = (code.match(/\n/g) || []).length;
  style.semicolons = statementsWithSemicolon > totalStatements * 0.5;
  
  // Detect quote style
  const singleQuotes = (code.match(/'/g) || []).length;
  const doubleQuotes = (code.match(/"/g) || []).length;
  style.quotes = singleQuotes > doubleQuotes ? 'single' : 'double';
  
  // Detect naming convention
  const camelCaseMatches = (code.match(/[a-z][A-Z]/g) || []).length;
  const snake_caseMatches = (code.match(/[a-z]_[a-z]/g) || []).length;
  const PascalCaseMatches = (code.match(/[A-Z][a-z][A-Z]/g) || []).length;
  
  if (camelCaseMatches > snake_caseMatches && camelCaseMatches > PascalCaseMatches) {
    style.namingConvention = 'camelCase';
  } else if (snake_caseMatches > camelCaseMatches) {
    style.namingConvention = 'snake_case';
  } else if (PascalCaseMatches > camelCaseMatches) {
    style.namingConvention = 'PascalCase';
  }
  
  // Detect patterns
  const patterns: any = {};
  if (code.includes('async') && code.includes('await')) patterns.asyncAwait = true;
  if (code.includes('function*')) patterns.generators = true;
  if (code.includes('=>')) patterns.arrowFunctions = true;
  if (code.includes('class ')) patterns.classes = true;
  if (code.includes('const ') || code.includes('let ')) patterns.modernJS = true;
  if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) {
    patterns.typescript = true;
  }
  
  // Detect comment style
  const inlineComments = (code.match(/\/\/ /g) || []).length;
  const blockComments = (code.match(/\/\*/g) || []).length;
  style.commentStyle = inlineComments > blockComments ? 'inline' : 'block';
  
  return { style, patterns };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, generatedCode, userFeedback, conversationId } = await req.json();
    
    console.log('🎓 Learning user preferences...');

    if (!userId || !generatedCode) {
      throw new Error('userId and generatedCode required');
    }

    // Analyze the code
    const { style, patterns } = analyzeCodeStyle(generatedCode);
    
    console.log('📊 Detected style:', style);
    console.log('🎯 Detected patterns:', patterns);

    // Get existing preferences
    const { data: existingPrefs } = await supabase
      .from('user_coding_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingPrefs) {
      // Merge with existing preferences (weighted average)
      const mergedStyle = { ...existingPrefs.code_style };
      const mergedPatterns = { ...existingPrefs.preferred_patterns };
      
      // Update style preferences with weight
      Object.keys(style).forEach(key => {
        if (key in mergedStyle) {
          // Keep existing if high confidence, otherwise adapt
          mergedStyle[key] = style[key];
        } else {
          mergedStyle[key] = style[key];
        }
      });
      
      // Merge patterns
      Object.keys(patterns).forEach(key => {
        mergedPatterns[key] = patterns[key];
      });

      // Update preferences
      await supabase
        .from('user_coding_preferences')
        .update({
          naming_convention: style.namingConvention || existingPrefs.naming_convention,
          code_style: mergedStyle,
          preferred_patterns: mergedPatterns,
          comment_style: style.commentStyle || existingPrefs.comment_style,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      console.log('✅ Updated user preferences');
    } else {
      // Create new preferences
      await supabase
        .from('user_coding_preferences')
        .insert({
          user_id: userId,
          naming_convention: style.namingConvention || 'camelCase',
          code_style: style,
          preferred_patterns: patterns,
          comment_style: style.commentStyle || 'inline'
        });

      console.log('✅ Created user preferences');
    }

    // If user provided feedback, adjust preferences
    if (userFeedback && userFeedback.satisfied === false) {
      const avoidPattern = {
        code: generatedCode.substring(0, 200),
        reason: userFeedback.reason || 'User rejected',
        timestamp: new Date().toISOString()
      };

      await supabase
        .from('user_coding_preferences')
        .update({
          avoid_patterns: supabase.rpc('jsonb_array_append', {
            arr: existingPrefs?.avoid_patterns || [],
            elem: avoidPattern
          })
        })
        .eq('user_id', userId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        learnedPreferences: {
          style,
          patterns,
          confidence: existingPrefs ? 'high' : 'initial'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Error learning preferences:', error);
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
