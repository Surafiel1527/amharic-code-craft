import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Bug, 
  Shield, 
  Zap, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useAICodeReview, CodeSuggestion } from '@/hooks/useAICodeReview';
import { cn } from '@/lib/utils';

interface AICodeReviewProps {
  code: string;
  filePath: string;
  language?: string;
  className?: string;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Critical'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    label: 'Warning'
  },
  info: {
    icon: Sparkles,
    color: 'text-info',
    bgColor: 'bg-info/10',
    label: 'Info'
  }
};

const typeConfig = {
  bug: { icon: Bug, label: 'Bug', color: 'destructive' },
  security: { icon: Shield, label: 'Security', color: 'destructive' },
  performance: { icon: Zap, label: 'Performance', color: 'default' },
  style: { icon: Sparkles, label: 'Style', color: 'secondary' },
  'best-practice': { icon: CheckCircle2, label: 'Best Practice', color: 'default' }
};

const SuggestionCard: React.FC<{
  suggestion: CodeSuggestion;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}> = ({ suggestion, onAccept, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const SeverityIcon = severityConfig[suggestion.severity].icon;
  const TypeIcon = typeConfig[suggestion.type].icon;

  return (
    <Card className={cn(
      "mb-4 transition-all hover:shadow-md",
      severityConfig[suggestion.severity].bgColor
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <SeverityIcon className={cn("h-5 w-5 mt-0.5", severityConfig[suggestion.severity].color)} />
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {suggestion.title}
                <Badge variant={typeConfig[suggestion.type].color as any} className="ml-2">
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeConfig[suggestion.type].label}
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Line {suggestion.lineNumber}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {suggestion.description}
        </p>

        {isExpanded && (
          <div className="space-y-3 mb-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Current Code:</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                <code>{suggestion.currentCode}</code>
              </pre>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-success mb-1">Suggested Fix:</p>
              <pre className="text-xs bg-success/10 p-2 rounded overflow-x-auto">
                <code>{suggestion.suggestedFix}</code>
              </pre>
            </div>

            <div className="bg-info/5 p-3 rounded">
              <p className="text-xs font-semibold text-info mb-1">💡 Explanation:</p>
              <p className="text-xs text-muted-foreground">{suggestion.explanation}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide Details' : 'View Details'}
          </Button>
          
          {!suggestion.accepted && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => onAccept(suggestion.id)}
                className="ml-auto"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Apply Fix
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(suggestion.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const AICodeReview: React.FC<AICodeReviewProps> = ({
  code,
  filePath,
  language = 'typescript',
  className
}) => {
  const {
    suggestions,
    isReviewing,
    summary,
    reviewCode,
    acceptSuggestion,
    dismissSuggestion
  } = useAICodeReview();

  const [activeTab, setActiveTab] = useState('all');

  const handleReview = () => {
    reviewCode(code, filePath, language);
  };

  const filteredSuggestions = suggestions.filter(s => {
    if (activeTab === 'all') return true;
    if (activeTab === 'critical') return s.severity === 'critical';
    if (activeTab === 'bugs') return s.type === 'bug';
    if (activeTab === 'security') return s.type === 'security';
    return true;
  });

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Code Review
              </CardTitle>
              <CardDescription>
                Automatic bug detection and suggestions
              </CardDescription>
            </div>
            <Button
              onClick={handleReview}
              disabled={isReviewing || !code}
            >
              {isReviewing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reviewing...
                </>
              ) : (
                'Review Code'
              )}
            </Button>
          </div>
        </CardHeader>

        {suggestions.length > 0 && (
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card className="border-destructive/50">
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold text-destructive">{summary.critical}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </CardContent>
              </Card>
              <Card className="border-warning/50">
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold text-warning">{summary.warnings}</p>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </CardContent>
              </Card>
              <Card className="border-info/50">
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold text-info">{summary.info}</p>
                  <p className="text-xs text-muted-foreground">Info</p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({summary.total})</TabsTrigger>
                <TabsTrigger value="critical">Critical ({summary.critical})</TabsTrigger>
                <TabsTrigger value="bugs">Bugs</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onAccept={acceptSuggestion}
                        onDismiss={dismissSuggestion}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No issues found in this category</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}

        {!isReviewing && suggestions.length === 0 && (
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Click "Review Code" to get AI-powered suggestions</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
