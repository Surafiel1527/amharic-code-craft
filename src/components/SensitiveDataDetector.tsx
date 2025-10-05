import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SensitivePattern {
  pattern: RegExp;
  type: string;
  message: string;
}

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    type: 'email',
    message: 'Email address detected'
  },
  {
    pattern: /\b(?:password|passwd|pwd)[\s:=]+[^\s]+/gi,
    type: 'password',
    message: 'Password detected'
  },
  {
    pattern: /\b(?:api[_-]?key|apikey|access[_-]?key)[\s:=]+[A-Za-z0-9_-]{20,}/gi,
    type: 'api_key',
    message: 'API key detected'
  },
  {
    pattern: /sk-[A-Za-z0-9]{48}/g,
    type: 'openai_key',
    message: 'OpenAI API key detected'
  },
  {
    pattern: /AIza[0-9A-Za-z_-]{35}/g,
    type: 'google_key',
    message: 'Google API key detected'
  },
  {
    pattern: /ghp_[A-Za-z0-9]{36}/g,
    type: 'github_token',
    message: 'GitHub token detected'
  },
  {
    pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g,
    type: 'slack_token',
    message: 'Slack token detected'
  },
  {
    pattern: /\b(?:Bearer|token)[\s:]+[A-Za-z0-9_-]{20,}/gi,
    type: 'bearer_token',
    message: 'Bearer token detected'
  },
  {
    pattern: /postgres:\/\/[^\s]+/gi,
    type: 'postgres_url',
    message: 'PostgreSQL connection string detected'
  },
  {
    pattern: /mongodb(\+srv)?:\/\/[^\s]+/gi,
    type: 'mongo_url',
    message: 'MongoDB connection string detected'
  },
  {
    pattern: /mysql:\/\/[^\s]+/gi,
    type: 'mysql_url',
    message: 'MySQL connection string detected'
  },
  {
    pattern: /\b(?:secret|private[_-]?key)[\s:=]+[^\s]{20,}/gi,
    type: 'secret',
    message: 'Secret key detected'
  },
  {
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    type: 'private_key',
    message: 'Private key detected'
  },
  {
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    type: 'ip_address',
    message: 'IP address detected'
  }
];

interface SensitiveDataDetectorProps {
  text: string;
  onWarning?: (detected: boolean) => void;
}

export const SensitiveDataDetector = ({ text, onWarning }: SensitiveDataDetectorProps) => {
  const [detectedTypes, setDetectedTypes] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const detected = new Set<string>();
    
    SENSITIVE_PATTERNS.forEach(({ pattern, type }) => {
      if (pattern.test(text)) {
        detected.add(type);
      }
    });

    setDetectedTypes(detected);
    setDismissed(false);
    onWarning?.(detected.size > 0);
  }, [text, onWarning]);

  if (detectedTypes.size === 0 || dismissed) {
    return null;
  }

  const warnings = Array.from(detectedTypes).map(type => {
    const pattern = SENSITIVE_PATTERNS.find(p => p.type === type);
    return pattern?.message || type;
  });

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>⚠️ Sensitive Information Detected</span>
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
        <div className="space-y-2">
          <p className="font-medium">The following sensitive data was detected in your message:</p>
          <ul className="list-disc list-inside space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx} className="text-sm">{warning}</li>
            ))}
          </ul>
          <div className="mt-3 p-3 bg-background/50 rounded-md text-sm">
            <p className="font-semibold mb-2">🔒 Security Recommendations:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Never share passwords, API keys, or credentials in chat</li>
              <li>Use the secure "Add Secret" feature for API keys</li>
              <li>Use the "Database Credentials" manager for database connections</li>
              <li>Connection strings should be stored as environment variables</li>
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
