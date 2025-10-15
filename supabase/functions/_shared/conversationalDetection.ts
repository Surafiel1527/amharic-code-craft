/**
 * Smart Conversational Detection
 * Detects if a request is conversational (no code generation needed)
 */

export function detectConversationalRequest(request: string): boolean {
  const normalized = request.toLowerCase().trim();
  
  // Greetings
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
  if (greetings.some(g => normalized === g || normalized.startsWith(g + ' '))) {
    return true;
  }
  
  // Simple questions without code context
  const simpleQuestions = [
    /^(what|who|when|where|why|how) (is|are|was|were|can|could|should|would)/i,
    /^(tell me|explain|describe|define|clarify)/i,
    /^(can you|could you|would you|will you) (tell|explain|describe)/i
  ];
  
  // Code-related keywords that indicate NOT conversational
  const codeKeywords = [
    'create', 'build', 'make', 'add', 'implement', 'develop', 'code', 'write',
    'function', 'component', 'class', 'app', 'website', 'page', 'button',
    'database', 'api', 'endpoint', 'route', 'style', 'design', 'layout',
    'fix', 'debug', 'error', 'issue', 'problem', 'bug', 'change', 'update',
    'modify', 'edit', 'remove', 'delete', 'refactor'
  ];
  
  const hasCodeKeyword = codeKeywords.some(keyword => normalized.includes(keyword));
  
  // If it has code keywords, it's NOT conversational
  if (hasCodeKeyword) {
    return false;
  }
  
  // If it matches simple question pattern and no code keywords, likely conversational
  const isSimpleQuestion = simpleQuestions.some(pattern => pattern.test(request));
  
  // Very short requests (< 30 chars) without code context are likely conversational
  const isVeryShort = request.length < 30 && !hasCodeKeyword;
  
  return isSimpleQuestion || isVeryShort;
}
