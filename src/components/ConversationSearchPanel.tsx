/**
 * Conversation Search Panel
 * 
 * Beyond-Enterprise: Advanced semantic search across all conversations.
 * Find relevant solutions, patterns, and code snippets instantly.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Code, MessageSquare, Calendar, ExternalLink } from "lucide-react";
import { useConversationSearch } from "@/hooks/useConversationSearch";
import { format } from "date-fns";
import { toast } from "sonner";

export function ConversationSearchPanel() {
  const [query, setQuery] = useState("");
  const { results, loading, search, clearResults } = useConversationSearch();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }
    await search(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Conversation Search
        </CardTitle>
        <CardDescription>
          Search across all your conversations to find relevant solutions and code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search for errors, solutions, code patterns..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? "Searching..." : "Search"}
          </Button>
          {results.length > 0 && (
            <Button variant="outline" onClick={clearResults}>
              Clear
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              <Badge variant="secondary">
                Sorted by relevance
              </Badge>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {results.map((result, index) => (
                  <Card key={`${result.conversationId}-${result.message.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">
                              {result.conversationTitle}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {result.relevanceScore}% match
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(result.timestamp), 'PPp')}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Navigate to conversation
                            window.location.href = `/workspace?conversation=${result.conversationId}`;
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm bg-muted p-3 rounded">
                          <p className="line-clamp-3">{result.message.content}</p>
                        </div>

                        {result.codeSnippet && (
                          <div className="relative">
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Code className="h-3 w-3" />
                                Code
                              </Badge>
                            </div>
                            <pre className="text-xs bg-card border p-3 rounded overflow-x-auto">
                              <code className="line-clamp-4">{result.codeSnippet}...</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No results found for "{query}"</p>
            <p className="text-sm mt-1">Try different keywords or phrases</p>
          </div>
        )}

        {!query && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Enter a search query to find relevant conversations</p>
            <p className="text-sm mt-1">Search for errors, solutions, or code patterns</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
