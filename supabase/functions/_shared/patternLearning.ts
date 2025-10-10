/**
 * Pattern Learning System
 * Learns from successful code generations and reuses proven patterns
 */

interface LearnedPattern {
  id: string;
  category: string;
  pattern_name: string;
  use_case: string;
  code_template: string;
  success_rate: number;
  times_used: number;
  avg_user_rating: number;
}

interface PatternMatch {
  pattern: LearnedPattern;
  relevanceScore: number;
  reason: string;
}

/**
 * Store a successful code pattern for future reuse
 */
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
    // Gracefully handle undefined supabase client
    if (!supabase) {
      console.warn('⚠️ Supabase client not available, skipping pattern storage');
      return;
    }

    // Check if pattern already exists
    const { data: existing } = await supabase
      .from('learned_patterns')
      .select('*')
      .eq('pattern_name', data.patternName)
      .eq('category', data.category)
      .maybeSingle();

    if (existing) {
      // Update existing pattern (increment usage, update success rate)
      await supabase
        .from('learned_patterns')
        .update({
          times_used: existing.times_used + 1,
          last_used_at: new Date().toISOString(),
          success_rate: Math.min(100, existing.success_rate + 2), // Gradually increase confidence
        })
        .eq('id', existing.id);

      console.log(`📈 Updated pattern "${data.patternName}" (used ${existing.times_used + 1} times)`);
    } else {
      // Create new pattern
      await supabase
        .from('learned_patterns')
        .insert({
          category: data.category,
          pattern_name: data.patternName,
          use_case: data.useCase,
          code_template: data.codeTemplate,
          success_rate: 75, // Start with moderate confidence
          times_used: 1,
          avg_user_rating: 0,
          context: data.context,
        });

      console.log(`✨ Stored new pattern "${data.patternName}" in category "${data.category}"`);
    }
  } catch (error) {
    console.error('Failed to store pattern:', error);
    // Non-critical, don't throw
  }
}

/**
 * Find relevant patterns for the current request
 */
export async function findRelevantPatterns(
  supabase: any,
  request: string,
  category?: string
): Promise<PatternMatch[]> {
  try {
    // Gracefully handle undefined supabase client
    if (!supabase) {
      console.warn('⚠️ Supabase client not available, skipping pattern matching');
      return [];
    }

    const query = supabase
      .from('learned_patterns')
      .select('*')
      .gte('success_rate', 60) // Only use patterns with >60% success
      .order('success_rate', { ascending: false })
      .limit(5);

    if (category) {
      query.eq('category', category);
    }

    const { data: patterns, error } = await query;

    if (error || !patterns) {
      console.log('No patterns found or error:', error);
      return [];
    }

    // Score patterns by relevance to current request
    const matches: PatternMatch[] = patterns
      .map((pattern: LearnedPattern) => {
        const relevanceScore = calculateRelevance(request, pattern);
        return {
          pattern,
          relevanceScore,
          reason: getMatchReason(request, pattern),
        };
      })
      .filter((match: PatternMatch) => match.relevanceScore > 0.3) // Only return relevant matches
      .sort((a: PatternMatch, b: PatternMatch) => b.relevanceScore - a.relevanceScore);

    if (matches.length > 0) {
      console.log(`🎯 Found ${matches.length} relevant patterns`);
      matches.forEach((m) => {
        console.log(`  - ${m.pattern.pattern_name} (${Math.round(m.relevanceScore * 100)}% match)`);
      });
    }

    return matches;
  } catch (error) {
    console.error('Failed to find patterns:', error);
    return [];
  }
}

/**
 * Calculate how relevant a pattern is to the current request
 */
function calculateRelevance(request: string, pattern: LearnedPattern): number {
  const requestLower = request.toLowerCase();
  const useCase = pattern.use_case.toLowerCase();
  const patternName = pattern.pattern_name.toLowerCase();

  let score = 0;

  // Direct keyword matches
  const keywords = [...useCase.split(' '), ...patternName.split(' ')];
  keywords.forEach((keyword) => {
    if (keyword.length > 3 && requestLower.includes(keyword)) {
      score += 0.2;
    }
  });

  // Category matches
  if (requestLower.includes(pattern.category.toLowerCase())) {
    score += 0.3;
  }

  // Weight by success rate
  score = score * (pattern.success_rate / 100);

  // Weight by usage frequency (proven patterns)
  if (pattern.times_used > 10) score += 0.1;
  if (pattern.times_used > 50) score += 0.1;

  return Math.min(1, score);
}

/**
 * Generate a human-readable reason for the match
 */
function getMatchReason(request: string, pattern: LearnedPattern): string {
  const requestLower = request.toLowerCase();
  const category = pattern.category.toLowerCase();
  const patternName = pattern.pattern_name.toLowerCase();

  if (requestLower.includes(category)) {
    return `Request mentions "${category}" which matches this pattern`;
  }

  const keywords = patternName.split(' ').filter((w) => w.length > 3);
  for (const keyword of keywords) {
    if (requestLower.includes(keyword)) {
      return `Request includes "${keyword}" from proven pattern`;
    }
  }

  return `Similar to successful past generations (${pattern.times_used} uses, ${pattern.success_rate}% success)`;
}

/**
 * Build AI prompt with learned patterns
 */
export function buildPromptWithPatterns(matches: PatternMatch[]): string {
  if (matches.length === 0) return '';

  let prompt = '\n\n🎯 LEARNED PATTERNS (Proven successful approaches):\n\n';

  matches.forEach((match, index) => {
    const p = match.pattern;
    prompt += `${index + 1}. ${p.pattern_name}\n`;
    prompt += `   Category: ${p.category}\n`;
    prompt += `   Use Case: ${p.use_case}\n`;
    prompt += `   Success Rate: ${p.success_rate}% (used ${p.times_used} times)\n`;
    prompt += `   Why relevant: ${match.reason}\n`;
    prompt += `   Template:\n${p.code_template}\n\n`;
  });

  prompt += '💡 INSTRUCTION: Adapt these proven patterns to the current request. They have high success rates.\n';

  return prompt;
}

/**
 * Extract pattern categories from request
 */
export function detectPatternCategory(request: string): string | undefined {
  const requestLower = request.toLowerCase();

  if (requestLower.includes('auth') || requestLower.includes('login') || requestLower.includes('signup')) {
    return 'authentication';
  }
  if (requestLower.includes('form') || requestLower.includes('input') || requestLower.includes('validation')) {
    return 'forms';
  }
  if (requestLower.includes('list') || requestLower.includes('table') || requestLower.includes('grid')) {
    return 'data-display';
  }
  if (requestLower.includes('dashboard') || requestLower.includes('chart') || requestLower.includes('graph')) {
    return 'analytics';
  }
  if (requestLower.includes('modal') || requestLower.includes('dialog') || requestLower.includes('popup')) {
    return 'ui-components';
  }
  if (requestLower.includes('api') || requestLower.includes('backend') || requestLower.includes('endpoint')) {
    return 'backend';
  }

  return undefined;
}
