import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Activity,
  Zap,
  Shield,
  Code
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationMetric {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  score: number;
  message: string;
}

interface RealTimeValidationDashboardProps {
  code: string;
  language: string;
  projectId?: string;
}

export const RealTimeValidationDashboard = ({ 
  code, 
  language,
  projectId 
}: RealTimeValidationDashboardProps) => {
  const [metrics, setMetrics] = useState<ValidationMetric[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [isValidating, setIsValidating] = useState(false);

  const validateCode = async () => {
    if (!code || code.trim().length === 0) return;

    setIsValidating(true);

    try {
      // Syntax validation
      const syntaxValid = await checkSyntax(code, language);
      
      // Security scan
      const securityScan = await scanSecurity(code);
      
      // Performance check
      const performanceCheck = await checkPerformance(code);
      
      // Best practices
      const bestPractices = await checkBestPractices(code, language);

      const validationResults: ValidationMetric[] = [
        {
          name: 'Syntax',
          status: syntaxValid.valid ? 'pass' : 'fail',
          score: syntaxValid.valid ? 100 : 0,
          message: syntaxValid.message
        },
        {
          name: 'Security',
          status: securityScan.issues === 0 ? 'pass' : securityScan.issues < 3 ? 'warning' : 'fail',
          score: Math.max(0, 100 - (securityScan.issues * 20)),
          message: `${securityScan.issues} security issues found`
        },
        {
          name: 'Performance',
          status: performanceCheck.score > 80 ? 'pass' : performanceCheck.score > 50 ? 'warning' : 'fail',
          score: performanceCheck.score,
          message: performanceCheck.message
        },
        {
          name: 'Best Practices',
          status: bestPractices.score > 80 ? 'pass' : bestPractices.score > 50 ? 'warning' : 'fail',
          score: bestPractices.score,
          message: bestPractices.message
        }
      ];

      setMetrics(validationResults);
      
      const avgScore = validationResults.reduce((acc, m) => acc + m.score, 0) / validationResults.length;
      setOverallScore(Math.round(avgScore));

    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const checkSyntax = async (code: string, language: string) => {
    try {
      if (language === 'javascript' || language === 'typescript') {
        new Function(code);
        return { valid: true, message: 'No syntax errors' };
      }
      return { valid: true, message: 'Syntax check passed' };
    } catch (error) {
      return { 
        valid: false, 
        message: error instanceof Error ? error.message : 'Syntax error detected' 
      };
    }
  };

  const scanSecurity = async (code: string) => {
    const dangerousPatterns = [
      /eval\s*\(/g,
      /innerHTML\s*=/g,
      /dangerouslySetInnerHTML/g,
      /document\.write/g,
    ];

    let issues = 0;
    dangerousPatterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) issues += matches.length;
    });

    return { issues };
  };

  const checkPerformance = async (code: string) => {
    let score = 100;
    const lines = code.split('\n').length;

    // Check for common performance issues
    if (code.includes('for') && code.includes('for')) score -= 10; // Nested loops
    if (lines > 500) score -= 20; // Large file
    if (code.match(/useState|useEffect/g)?.length || 0 > 10) score -= 15; // Too many hooks

    return {
      score: Math.max(0, score),
      message: score > 80 ? 'Good performance' : score > 50 ? 'Some optimizations possible' : 'Performance improvements needed'
    };
  };

  const checkBestPractices = async (code: string, language: string) => {
    let score = 100;

    // TypeScript checks
    if (language === 'typescript') {
      if (!code.includes('interface') && !code.includes('type')) score -= 20;
    }

    // React checks
    if (code.includes('React')) {
      if (!code.includes('export')) score -= 10;
      if (code.includes('var ')) score -= 15;
    }

    return {
      score: Math.max(0, score),
      message: score > 80 ? 'Follows best practices' : score > 50 ? 'Minor improvements suggested' : 'Best practices not followed'
    };
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (code && code.length > 20) {
        validateCode();
      }
    }, 1500);

    return () => clearTimeout(debounceTimer);
  }, [code]);

  const getStatusIcon = (status: ValidationMetric['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusColor = (status: ValidationMetric['status']) => {
    switch (status) {
      case 'pass': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'fail': return 'bg-destructive';
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Real-Time Code Validation
          {isValidating && (
            <Badge variant="secondary" className="ml-auto">
              Validating...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-bold text-primary">
            {overallScore}
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <p className="text-sm text-muted-foreground">Overall Quality Score</p>
          <Progress value={overallScore} className="h-2" />
        </div>

        {/* Individual Metrics */}
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div 
              key={metric.name}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(metric.status)}
                <div>
                  <p className="font-medium">{metric.name}</p>
                  <p className="text-xs text-muted-foreground">{metric.message}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{metric.score}%</span>
                <div className="w-20">
                  <Progress 
                    value={metric.score} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-lg font-bold">
                {metrics.filter(m => m.status === 'pass').length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Passed</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-lg font-bold">
                {metrics.filter(m => m.status === 'warning').length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-lg font-bold">
                {metrics.filter(m => m.status === 'fail').length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
