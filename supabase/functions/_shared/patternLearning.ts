/**
 * Enhanced Pattern Learning System with Autonomous Evolution
 * Learns from successful and failed generations to improve future results
 * Now includes intelligent pattern evolution and context-aware learning
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface LearnedPattern {
  id: string;
  pattern_name: string;
  use_case: string;
  code_template: string;
  success_rate: number;
  times_used: number;
  avg_user_rating: number;
  // Removed category - column doesn't exist in schema
}

interface PatternMatch {
  pattern: LearnedPattern;
  relevanceScore: number;
  reason: string;
}

export async function storeSuccessfulPattern(
  supabase: any,
  data: {
    category: string;
    patternName: string;
    useCase: string;
    codeTemplate: string;
    context: Record<string, any>;
  }
): Promise<void> {
  try {
    if (!supabase) {
      console.warn('⚠️ Supabase client not available, skipping pattern storage');
      return;
    }

    const { data: existing } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('pattern_name', data.patternName)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('learned_patterns')
        .update({
          times_used: existing.times_used + 1,
          last_used_at: new Date().toISOString(),
          success_rate: Math.min(100, existing.success_rate + 2),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('learned_patterns').insert({
        pattern_name: data.patternName,
        use_case: data.useCase,
        code_template: data.codeTemplate,
        success_rate: 75,
        times_used: 1,
        avg_user_rating: 0,
        context: data.context,
      });
    }
  } catch (error) {
    console.error('Failed to store pattern:', error);
  }
}

export async function findRelevantPatterns(
  supabase: any,
  request: string,
  category?: string
): Promise<PatternMatch[]> {
  try {
    if (!supabase) return [];

    const query = supabase
      .from('learned_patterns')
      .select('*')
      .gte('success_rate', 60)
      .order('success_rate', { ascending: false })
      .limit(5);

    // Removed category filter - column doesn't exist in schema

    const { data: patterns } = await query;
    if (!patterns) return [];

    const matches: PatternMatch[] = patterns
      .map((pattern: LearnedPattern) => ({
        pattern,
        relevanceScore: calculateRelevance(request, pattern),
        reason: getMatchReason(request, pattern),
      }))
      .filter((match: PatternMatch) => match.relevanceScore > 0.3)
      .sort((a: PatternMatch, b: PatternMatch) => b.relevanceScore - a.relevanceScore);

    return matches;
  } catch (error) {
    console.error('Failed to find patterns:', error);
    return [];
  }
}

function calculateRelevance(request: string, pattern: LearnedPattern): number {
  const requestLower = request.toLowerCase();
  let score = 0;
  
  const keywords = [...pattern.use_case.toLowerCase().split(' '), ...pattern.pattern_name.toLowerCase().split(' ')];
  keywords.forEach((keyword) => {
    if (keyword.length > 3 && requestLower.includes(keyword)) score += 0.2;
  });

  // Removed category scoring - column doesn't exist
  score = score * (pattern.success_rate / 100);
  if (pattern.times_used > 10) score += 0.1;
  if (pattern.times_used > 50) score += 0.1;

  return Math.min(1, score);
}

function getMatchReason(request: string, pattern: LearnedPattern): string {
  // Simplified - removed category reference as column doesn't exist
  return `Similar to successful past generations (${pattern.times_used} uses, ${pattern.success_rate}% success)`;
}

export function buildPromptWithPatterns(matches: PatternMatch[]): string {
  if (matches.length === 0) return '';
  let prompt = '\n\n🎯 LEARNED PATTERNS:\n\n';
  matches.forEach((match, index) => {
    const p = match.pattern;
    prompt += `${index + 1}. ${p.pattern_name}\n   Success: ${p.success_rate}%\n   Template:\n${p.code_template}\n\n`;
  });
  return prompt;
}

export function detectPatternCategory(request: string): string | undefined {
  const requestLower = request.toLowerCase();
  if (requestLower.includes('auth')) return 'authentication';
  if (requestLower.includes('form')) return 'forms';
  if (requestLower.includes('list') || requestLower.includes('table')) return 'data-display';
  return undefined;
}

// NEW: Autonomous learning functions
export async function evolvePatterns(
  supabase: SupabaseClient,
  contextRequirements?: Record<string, any>
): Promise<void> {
  const { data: patterns } = await supabase
    .from('universal_error_patterns')
    .select('*')
    .order('last_used_at', { ascending: false });

  if (!patterns || patterns.length === 0) return;

  for (const pattern of patterns) {
    const totalAttempts = pattern.success_count + pattern.failure_count;
    if (totalAttempts < 5) continue;

    const currentSuccessRate = pattern.success_count / totalAttempts;
    const newConfidence = (currentSuccessRate * 0.8) + (pattern.confidence_score * 0.2);

    if (Math.abs(newConfidence - pattern.confidence_score) > 0.1) {
      await supabase
        .from('universal_error_patterns')
        .update({
          confidence_score: newConfidence,
          context_requirements: {
            ...pattern.context_requirements,
            ...contextRequirements,
            evolved_at: new Date().toISOString()
          }
        })
        .eq('id', pattern.id);
    }
  }
}

export async function getRelevantPatterns(supabase: SupabaseClient, request: string): Promise<any[]> {
  const { data } = await supabase
    .from('universal_error_patterns')
    .select('*')
    .gte('confidence_score', 0.6)
    .limit(5);
  return data || [];
}

export async function storeGenerationPattern(supabase: SupabaseClient, data: any): Promise<void> {
  // FUTURE: Replace with resilientDb when available in context
  // For now, direct insert is acceptable for pattern storage
  await supabase.from('generation_patterns').insert(data);
}
