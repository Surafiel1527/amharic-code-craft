/**
 * WEB SEARCH ENGINE
 * Real integration with Google Programmable Search Engine
 * Provides intelligent web research capabilities for AGI
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export interface WebSearchResponse {
  found: boolean;
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  synthesizedAnswer?: string;
  sources: string[];
  confidence: number;
}

/**
 * Search the web using Google Programmable Search Engine
 */
export async function searchWeb(
  query: string,
  maxResults: number = 10
): Promise<WebSearchResponse> {
  const startTime = Date.now();
  
  // Validate inputs
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      found: false,
      query: '',
      results: [],
      totalResults: 0,
      searchTime: 0,
      sources: [],
      confidence: 0
    };
  }

  if (query.length > 2048) {
    console.warn('Search query too long, truncating');
    query = query.slice(0, 2048);
  }

  const apiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY');
  const searchEngineId = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID');

  if (!apiKey || !searchEngineId) {
    console.warn('Google Search credentials not configured');
    return {
      found: false,
      query,
      results: [],
      totalResults: 0,
      searchTime: 0,
      sources: [],
      confidence: 0
    };
  }

  // Validate maxResults
  const safeMaxResults = Math.max(1, Math.min(maxResults, 10));

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${safeMaxResults}`;
    
    console.log('🔍 Searching web:', query.slice(0, 100));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const results: SearchResult[] = (data.items || []).map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink
    }));

    const totalResults = parseInt(data.searchInformation?.totalResults || '0');
    const searchTime = Date.now() - startTime;

    // Extract sources (unique domains)
    const sources = [...new Set(results.map(r => r.displayLink))];

    // Calculate confidence based on result count and relevance
    const confidence = calculateSearchConfidence(results, query);

    console.log(`✅ Search completed: ${results.length} results in ${searchTime}ms`);

    return {
      found: results.length > 0,
      query,
      results,
      totalResults,
      searchTime,
      sources,
      confidence
    };

  } catch (error) {
    console.error('Web search error:', error);
    return {
      found: false,
      query,
      results: [],
      totalResults: 0,
      searchTime: Date.now() - startTime,
      sources: [],
      confidence: 0
    };
  }
}

/**
 * Search and synthesize answer using AI
 */
export async function searchAndSynthesize(
  query: string,
  aiHelper: (prompt: string) => Promise<string>
): Promise<WebSearchResponse> {
  // First, search the web
  const searchResults = await searchWeb(query);

  if (!searchResults.found) {
    return searchResults;
  }

  // Synthesize answer from search results using AI
  const synthesisPrompt = `Based on these web search results for "${query}", provide a concise, accurate answer:

${searchResults.results.map((r, i) => `
${i + 1}. ${r.title}
Source: ${r.displayLink}
${r.snippet}
`).join('\n')}

Synthesize a clear, factual answer citing specific sources. Focus on accuracy and relevance.`;

  try {
    const synthesizedAnswer = await aiHelper(synthesisPrompt);
    
    return {
      ...searchResults,
      synthesizedAnswer
    };
  } catch (error) {
    console.error('Synthesis error:', error);
    return searchResults;
  }
}

/**
 * Calculate confidence score for search results
 */
function calculateSearchConfidence(results: SearchResult[], query: string): number {
  if (results.length === 0) return 0;

  let score = 0;
  const queryTerms = query.toLowerCase().split(/\s+/);

  // Factor 1: Number of results (max 0.3)
  score += Math.min(results.length / 10, 0.3);

  // Factor 2: Term matching in titles/snippets (max 0.4)
  const avgMatch = results.reduce((sum, result) => {
    const text = (result.title + ' ' + result.snippet).toLowerCase();
    const matches = queryTerms.filter(term => text.includes(term)).length;
    return sum + (matches / queryTerms.length);
  }, 0) / results.length;
  score += avgMatch * 0.4;

  // Factor 3: Source diversity (max 0.3)
  const uniqueDomains = new Set(results.map(r => r.displayLink)).size;
  score += Math.min(uniqueDomains / 5, 0.3);

  return Math.min(score, 1);
}

/**
 * Search for specific code examples or documentation
 */
export async function searchCodeExamples(
  technology: string,
  problem: string
): Promise<WebSearchResponse> {
  const query = `${technology} ${problem} code example site:github.com OR site:stackoverflow.com`;
  return await searchWeb(query, 5);
}

/**
 * Search for latest documentation
 */
export async function searchDocumentation(
  technology: string,
  feature: string
): Promise<WebSearchResponse> {
  const query = `${technology} ${feature} documentation official`;
  return await searchWeb(query, 5);
}
