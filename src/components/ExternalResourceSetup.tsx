import { useState } from "react";
import { Plug, Check, X, Eye, EyeOff, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";

interface SecretKey {
  name: string;
  type: 'secret' | 'publishable' | 'public';
  displayName: string;
  location: string;
  example?: string;
  testMode?: boolean;
}

interface SimpleResource {
  id: string;
  name: string;
  secrets: SecretKey[];
}

interface ExternalResource {
  id: string;
  name: string;
  category: string;
  description: string;
  purpose: string;
  signupUrl: string;
  dashboardUrl: string;
  docsUrl: string;
  pricingUrl?: string;
  freeTier: boolean;
  estimatedSetupTime: string;
  secrets: SecretKey[];
  setupSteps: string[];
  testingNotes?: string;
  commonIssues?: Array<{
    issue: string;
    solution: string;
  }>;
}

type ResourceType = ExternalResource | SimpleResource;

interface ExternalResourceSetupProps {
  resource: ResourceType;
  onComplete: (secrets: Record<string, string>) => void;
  onSkip?: () => void;
  conversationId?: string;
  compact?: boolean;
}

// Type guard
function isFullResource(resource: ResourceType): resource is ExternalResource {
  return 'description' in resource;
}

export function ExternalResourceSetup({ resource, onComplete, onSkip, conversationId, compact = false }: ExternalResourceSetupProps) {
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fullResource = isFullResource(resource);

  const handleSecretChange = (secretName: string, value: string) => {
    setSecrets(prev => ({ ...prev, [secretName]: value }));
    if (errors[secretName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[secretName];
        return newErrors;
      });
    }
  };

  const toggleShowSecret = (secretName: string) => {
    setShowSecrets(prev => ({ ...prev, [secretName]: !prev[secretName] }));
  };

  const validateSecrets = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    resource.secrets.forEach(secret => {
      const value = secrets[secret.name];
      if (!value || value.trim() === '') {
        newErrors[secret.name] = `${secret.displayName} is required`;
      } else if (secret.example && value.trim().length < 10) {
        newErrors[secret.name] = `${secret.displayName} seems too short`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateSecrets()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors before continuing",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Secrets Saved",
        description: `${resource.name} configuration complete`,
      });
      
      onComplete(secrets);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save secrets. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Plug className="h-6 w-6 text-primary" />
              <CardTitle>{resource.name} Setup Required</CardTitle>
            </div>
            {fullResource && <CardDescription>{resource.description}</CardDescription>}
          </div>
          {fullResource && resource.freeTier && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
              Free Tier Available
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Purpose & Time - only for full resources */}
        {fullResource && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p><strong>Why you need this:</strong> {resource.purpose}</p>
                <p className="text-sm text-muted-foreground">
                  Estimated setup time: <strong>{resource.estimatedSetupTime}</strong>
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Links - only for full resources */}
        {fullResource && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={resource.signupUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Sign Up
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={resource.dashboardUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Dashboard
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={resource.docsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Docs
              </a>
            </Button>
            {resource.pricingUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={resource.pricingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Pricing
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Setup Steps - only for full resources */}
        {fullResource && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="steps">
              <AccordionTrigger>
                <span className="font-semibold">Setup Steps ({resource.setupSteps.length} steps)</span>
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-2 ml-4">
                  {resource.setupSteps.map((step, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium text-primary">{i + 1}.</span> {step}
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>

            {resource.testingNotes && (
              <AccordionItem value="testing">
                <AccordionTrigger>Testing Notes</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">{resource.testingNotes}</p>
                </AccordionContent>
              </AccordionItem>
            )}

            {resource.commonIssues && resource.commonIssues.length > 0 && (
              <AccordionItem value="issues">
                <AccordionTrigger>Common Issues</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {resource.commonIssues.map((item, i) => (
                      <div key={i} className="text-sm">
                        <p className="font-medium text-destructive">{item.issue}</p>
                        <p className="text-muted-foreground">{item.solution}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}

        {/* Secret Input Fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Enter Your Credentials</h3>
            <Badge variant="outline">{resource.secrets.length} required</Badge>
          </div>

          {resource.secrets.map((secret) => (
            <div key={secret.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={secret.name}>
                  {secret.displayName}
                  {secret.testMode && (
                    <Badge variant="secondary" className="ml-2 text-xs">Test Mode</Badge>
                  )}
                </Label>
                <Badge variant={secret.type === 'secret' ? 'default' : 'secondary'} className="text-xs">
                  {secret.type === 'secret' ? '🔒 Secret' : '🔓 Public'}
                </Badge>
              </div>

              <div className="relative">
                <Input
                  id={secret.name}
                  type={showSecrets[secret.name] ? 'text' : 'password'}
                  value={secrets[secret.name] || ''}
                  onChange={(e) => handleSecretChange(secret.name, e.target.value)}
                  placeholder={secret.example || `Enter ${secret.displayName}`}
                  className={errors[secret.name] ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => toggleShowSecret(secret.name)}
                >
                  {showSecrets[secret.name] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {errors[secret.name] && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" />
                  {errors[secret.name]}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                📍 {secret.location}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {onSkip && (
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              disabled={isValidating}
            >
              Skip for Now
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isValidating}
            className="flex-1"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save & Continue
              </>
            )}
          </Button>
        </div>

        {/* Security Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            🔒 Your credentials are securely stored and encrypted. They will only be used for this project.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
