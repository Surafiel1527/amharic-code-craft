import { useEffect, useState, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, X, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SensitivePattern {
  pattern: RegExp;
  type: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'credentials' | 'tokens' | 'personal' | 'infrastructure';
}

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // Critical - API Keys & Secrets
  { pattern: /sk-[A-Za-z0-9]{48}/g, type: 'openai_key', message: 'OpenAI API key', severity: 'critical', category: 'tokens' },
  { pattern: /sk-proj-[A-Za-z0-9_-]{48,}/g, type: 'openai_project_key', message: 'OpenAI Project key', severity: 'critical', category: 'tokens' },
  { pattern: /AIza[0-9A-Za-z_-]{35}/g, type: 'google_key', message: 'Google API key', severity: 'critical', category: 'tokens' },
  { pattern: /ghp_[A-Za-z0-9]{36}/g, type: 'github_token', message: 'GitHub personal access token', severity: 'critical', category: 'tokens' },
  { pattern: /gho_[A-Za-z0-9]{36}/g, type: 'github_oauth', message: 'GitHub OAuth token', severity: 'critical', category: 'tokens' },
  { pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g, type: 'slack_token', message: 'Slack token', severity: 'critical', category: 'tokens' },
  { pattern: /AKIA[0-9A-Z]{16}/g, type: 'aws_key', message: 'AWS Access Key ID', severity: 'critical', category: 'tokens' },
  { pattern: /r8_[A-Za-z0-9]{40}/g, type: 'replicate_key', message: 'Replicate API key', severity: 'critical', category: 'tokens' },
  
  // High - Connection Strings & Credentials
  { pattern: /postgres(?:ql)?:\/\/[^\s]+/gi, type: 'postgres_url', message: 'PostgreSQL connection string', severity: 'high', category: 'infrastructure' },
  { pattern: /mongodb(\+srv)?:\/\/[^\s]+/gi, type: 'mongo_url', message: 'MongoDB connection string', severity: 'high', category: 'infrastructure' },
  { pattern: /mysql:\/\/[^\s]+/gi, type: 'mysql_url', message: 'MySQL connection string', severity: 'high', category: 'infrastructure' },
  { pattern: /redis:\/\/[^\s]+/gi, type: 'redis_url', message: 'Redis connection string', severity: 'high', category: 'infrastructure' },
  { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, type: 'private_key', message: 'Private key (PEM format)', severity: 'high', category: 'credentials' },
  
  // Medium - Passwords & Secrets
  { pattern: /(?:password|passwd|pwd)[\s:=]+["']?[^\s"']{8,}["']?/gi, type: 'password', message: 'Password', severity: 'medium', category: 'credentials' },
  { pattern: /(?:api[_-]?key|apikey|access[_-]?key)[\s:=]+["']?[A-Za-z0-9_-]{20,}["']?/gi, type: 'api_key', message: 'Generic API key', severity: 'medium', category: 'tokens' },
  { pattern: /(?:Bearer|token)[\s:]+[A-Za-z0-9_-]{20,}/gi, type: 'bearer_token', message: 'Bearer token', severity: 'medium', category: 'tokens' },
  { pattern: /(?:secret|private[_-]?key)[\s:=]+["']?[^\s"']{20,}["']?/gi, type: 'secret', message: 'Secret key', severity: 'medium', category: 'credentials' },
  
  // Low - Personal Information
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'email', message: 'Email address', severity: 'low', category: 'personal' },
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, type: 'ip_address', message: 'IP address', severity: 'low', category: 'infrastructure' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'ssn', message: 'Social Security Number', severity: 'high', category: 'personal' },
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, type: 'credit_card', message: 'Credit card number', severity: 'critical', category: 'personal' },
];

interface EnhancedSensitiveDataDetectorProps {
  text: string;
  onWarning?: (detected: boolean) => void;
  autoMask?: boolean;
  onMaskedText?: (maskedText: string) => void;
}

export const EnhancedSensitiveDataDetector = ({ 
  text, 
  onWarning, 
  autoMask = false,
  onMaskedText 
}: EnhancedSensitiveDataDetectorProps) => {
  const [detectedItems, setDetectedItems] = useState<Array<{ type: string; message: string; severity: string; category: string; match: string }>>([]);
  const [dismissed, setDismissed] = useState(false);
  const [showMasked, setShowMasked] = useState(false);
  const [maskingEnabled, setMaskingEnabled] = useState(autoMask);

  const { maskedText, detectedCount } = useMemo(() => {
    const detected: Array<{ type: string; message: string; severity: string; category: string; match: string }> = [];
    let masked = text;
    
    SENSITIVE_PATTERNS.forEach(({ pattern, type, message, severity, category }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          detected.push({ type, message, severity, category, match });
          if (maskingEnabled) {
            // Mask the sensitive data
            const maskLength = Math.min(match.length, 20);
            const visibleStart = match.substring(0, 4);
            const visibleEnd = match.length > 8 ? match.substring(match.length - 4) : '';
            const replacement = `${visibleStart}${'*'.repeat(maskLength - 8)}${visibleEnd}`;
            masked = masked.replace(match, replacement);
          }
        });
      }
    });

    return { maskedText: masked, detectedCount: detected.length };
  }, [text, maskingEnabled]);

  useEffect(() => {
    setDetectedItems(Array.from(new Map(
      maskedText !== text ? 
        detectedItems.map(item => [item.type, item]) : []
    ).values()));
    setDismissed(false);
    onWarning?.(detectedCount > 0);
    
    if (maskingEnabled && maskedText !== text) {
      onMaskedText?.(maskedText);
    }
  }, [text, detectedCount, maskingEnabled]);

  if (detectedItems.length === 0 || dismissed) {
    return null;
  }

  const criticalCount = detectedItems.filter(i => i.severity === 'critical').length;
  const highCount = detectedItems.filter(i => i.severity === 'high').length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <Alert variant="destructive" className="mb-4 border-2">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <span className="text-lg font-bold">🚨 Security Alert: Sensitive Data Detected</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-4 mt-3">
          {/* Summary Stats */}
          <div className="flex gap-2 flex-wrap">
            {criticalCount > 0 && (
              <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                🔴 {criticalCount} Critical
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                🟠 {highCount} High
              </Badge>
            )}
            <Badge variant="outline">
              Total: {detectedItems.length} sensitive items
            </Badge>
          </div>

          {/* Auto-masking Toggle */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-md">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-mask" className="cursor-pointer">
                {maskingEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="ml-2">Auto-mask sensitive data</span>
              </Label>
            </div>
            <Switch
              id="auto-mask"
              checked={maskingEnabled}
              onCheckedChange={setMaskingEnabled}
            />
          </div>

          {/* Detected Items */}
          <div className="space-y-2">
            <p className="font-semibold text-sm">Detected sensitive information:</p>
            <div className="grid grid-cols-2 gap-2">
              {detectedItems.map((item, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className={getSeverityColor(item.severity)}
                >
                  {item.message}
                </Badge>
              ))}
            </div>
          </div>

          {/* Security Recommendations */}
          <div className="mt-4 p-4 bg-background/50 rounded-lg border-2 border-primary/20">
            <p className="font-bold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              🔒 Security Recommendations
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Never</strong> share passwords, API keys, or credentials in chat</li>
              <li>Use the <strong>"Add Secret"</strong> feature for API keys and tokens</li>
              <li>Use the <strong>"Database Credentials Manager"</strong> for database connections</li>
              <li>Connection strings should be stored as <strong>environment variables</strong></li>
              <li>Enable <strong>auto-masking</strong> to automatically redact sensitive data</li>
              <li>Review and rotate compromised credentials <strong>immediately</strong></li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setShowMasked(!showMasked)}>
              {showMasked ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showMasked ? 'Hide' : 'Show'} Masked Version
            </Button>
          </div>

          {/* Masked Text Preview */}
          {showMasked && maskingEnabled && (
            <div className="mt-3 p-3 bg-muted rounded-md">
              <p className="text-xs font-semibold mb-2 text-muted-foreground">Masked Preview:</p>
              <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                {maskedText}
              </pre>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
