import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Shield, Bug, Rocket, Eye, Star, Zap, AlertTriangle,
  CheckCircle2, XCircle, TrendingUp, Code2, Copy, Download,
  Lock, Activity, BarChart3, Sparkles
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function SuperMegaMindHub() {
  const [activeTab, setActiveTab] = useState("reviewer");
  
  // Code Reviewer State
  const [reviewCode, setReviewCode] = useState("");
  const [reviewLanguage, setReviewLanguage] = useState("javascript");
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // AI Debugger State
  const [errorMessage, setErrorMessage] = useState("");
  const [errorStackTrace, setErrorStackTrace] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [debugResult, setDebugResult] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  // Security Scanner State
  const [scanCode, setScanCode] = useState("");
  const [scanDependencies, setScanDependencies] = useState("");
  const [securityScan, setSecurityScan] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Auto Deployer State
  const [deployProjectName, setDeployProjectName] = useState("");
  const [deployFiles, setDeployFiles] = useState("");
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleCodeReview = async () => {
    if (!reviewCode.trim()) {
      toast.error("Please enter code to review");
      return;
    }

    setIsReviewing(true);
    setReviewResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('unified-ai-workers', {
        body: { 
          operation: 'code_review',
          params: {
            code: reviewCode,
            language: reviewLanguage,
            filename: `code.${reviewLanguage}`
          }
        }
      });

      if (error) throw error;

      setReviewResult(data);
      toast.success(`Review complete! Grade: ${data.grade}`, {
        description: `Overall score: ${data.overallScore}/100`
      });
    } catch (error: any) {
      console.error('Code review error:', error);
      toast.error(error.message || 'Review failed');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleDebug = async () => {
    if (!errorMessage.trim()) {
      toast.error("Please enter an error message");
      return;
    }

    setIsDebugging(true);
    setDebugResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-debugger', {
        body: {
          errorMessage,
          stackTrace: errorStackTrace,
          code: errorCode,
          language: 'javascript'
        }
      });

      if (error) throw error;

      setDebugResult(data);
      toast.success(`Debug analysis complete!`, {
        description: `Found ${data.solutions.length} solutions`
      });
    } catch (error: any) {
      console.error('Debug error:', error);
      toast.error(error.message || 'Debug failed');
    } finally {
      setIsDebugging(false);
    }
  };

  const handleSecurityScan = async () => {
    if (!scanCode.trim()) {
      toast.error("Please enter code to scan");
      return;
    }

    setIsScanning(true);
    setSecurityScan(null);

    try {
      const deps = scanDependencies.split('\n').filter(d => d.trim());
      
      const { data, error } = await supabase.functions.invoke('security-vulnerability-scanner', {
        body: {
          code: scanCode,
          dependencies: deps,
          language: 'javascript',
          framework: 'react'
        }
      });

      if (error) throw error;

      setSecurityScan(data);
      toast.success(`Security scan complete!`, {
        description: `Risk level: ${data.overallRisk.toUpperCase()}`
      });
    } catch (error: any) {
      console.error('Security scan error:', error);
      toast.error(error.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeploy = async () => {
    if (!deployProjectName.trim() || !deployFiles.trim()) {
      toast.error("Please enter project name and files");
      return;
    }

    setIsDeploying(true);
    setDeploymentResult(null);

    try {
      // Parse files from textarea (simple format: path:content)
      const filesArray = deployFiles.split('\n---\n').map(block => {
        const [path, ...content] = block.split('\n');
        return {
          path: path.trim(),
          content: content.join('\n')
        };
      });

      const { data, error } = await supabase.functions.invoke('auto-deployer', {
        body: {
          projectName: deployProjectName,
          framework: 'react',
          files: filesArray
        }
      });

      if (error) throw error;

      setDeploymentResult(data);
      
      if (data.success) {
        toast.success("Deployment successful!", {
          description: `Deployed to: ${data.deploymentUrl}`
        });
      } else {
        toast.error("Deployment failed", {
          description: data.error
        });
      }
    } catch (error: any) {
      console.error('Deployment error:', error);
      toast.error(error.message || 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-50 dark:bg-red-950/20';
      case 'high': return 'text-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      case 'low': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/20';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 animate-pulse">
          <Star className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
            ⚡ Super Mega Mind Hub
          </h1>
          <p className="text-muted-foreground">
            AI Code Review, Debugging, Security Scanning & Auto-Deployment
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reviewer" className="gap-2">
            <Eye className="w-4 h-4" />
            Code Review
          </TabsTrigger>
          <TabsTrigger value="debugger" className="gap-2">
            <Bug className="w-4 h-4" />
            AI Debugger
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security Scan
          </TabsTrigger>
          <TabsTrigger value="deployer" className="gap-2">
            <Rocket className="w-4 h-4" />
            Auto Deploy
          </TabsTrigger>
        </TabsList>

        {/* AI Code Reviewer Tab */}
        <TabsContent value="reviewer" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-500" />
                  AI Code Reviewer
                </CardTitle>
                <CardDescription>Get expert code review with AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <select
                    value={reviewLanguage}
                    onChange={(e) => setReviewLanguage(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="react">React</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Your Code</Label>
                  <Textarea
                    value={reviewCode}
                    onChange={(e) => setReviewCode(e.target.value)}
                    placeholder="Paste your code here for review..."
                    className="font-mono text-sm min-h-[350px]"
                  />
                </div>

                <Button
                  onClick={handleCodeReview}
                  disabled={isReviewing || !reviewCode}
                  className="w-full"
                  size="lg"
                >
                  {isReviewing ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-spin" />
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Review Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Results</CardTitle>
                <CardDescription>
                  {reviewResult ? `Grade: ${reviewResult.grade}` : 'Results will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewResult ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {/* Overall Score */}
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold">{reviewResult.grade}</h3>
                          <Badge variant="default" className="text-lg">
                            {reviewResult.overallScore}/100
                          </Badge>
                        </div>
                        <Progress value={reviewResult.overallScore} className="h-2" />
                      </div>

                      {/* Category Scores */}
                      <div className="space-y-2">
                        <h4 className="font-semibold">Category Scores</h4>
                        {Object.entries(reviewResult.categories).map(([category, data]: [string, any]) => (
                          <div key={category} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="capitalize">{category.replace(/([A-Z])/g, ' $1')}</span>
                              <span className="font-medium">{data.score}/100</span>
                            </div>
                            <Progress value={data.score} className="h-1" />
                          </div>
                        ))}
                      </div>

                      {/* Improvements */}
                      {reviewResult.improvements.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold">Suggested Improvements</h4>
                          {reviewResult.improvements.map((imp: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded-lg ${getSeverityColor(imp.type)}`}>
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">{imp.type}</Badge>
                                    <h5 className="font-semibold text-sm">{imp.title}</h5>
                                  </div>
                                  <p className="text-xs mt-1">{imp.description}</p>
                                  {imp.suggestedFix && (
                                    <pre className="mt-2 p-2 bg-background/50 rounded text-xs overflow-x-auto">
                                      {imp.suggestedFix}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Strengths */}
                      {reviewResult.strengths.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Strengths
                          </h4>
                          <ul className="space-y-1">
                            {reviewResult.strengths.map((strength: string, idx: number) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-green-500">✓</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <Eye className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Submit code for AI review
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Debugger Tab */}
        <TabsContent value="debugger" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-red-500" />
                  AI Debugger
                </CardTitle>
                <CardDescription>Get AI-powered debugging help</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Error Message *</Label>
                  <Textarea
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                    placeholder="TypeError: Cannot read property 'map' of undefined"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stack Trace (Optional)</Label>
                  <Textarea
                    value={errorStackTrace}
                    onChange={(e) => setErrorStackTrace(e.target.value)}
                    placeholder="at App.tsx:42:15..."
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Related Code (Optional)</Label>
                  <Textarea
                    value={errorCode}
                    onChange={(e) => setErrorCode(e.target.value)}
                    placeholder="const items = data.map(...);"
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>

                <Button
                  onClick={handleDebug}
                  disabled={isDebugging || !errorMessage}
                  className="w-full"
                  size="lg"
                >
                  {isDebugging ? (
                    <>
                      <Bug className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Debug Error
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Debug Analysis</CardTitle>
                <CardDescription>
                  {debugResult ? `${debugResult.solutions.length} solutions found` : 'Analysis will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {debugResult ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {/* Error Analysis */}
                      <div className={`p-4 rounded-lg ${getSeverityColor(debugResult.errorAnalysis.severity)}`}>
                        <h3 className="font-semibold mb-2">{debugResult.errorAnalysis.errorType}</h3>
                        <Badge variant="outline">{debugResult.errorAnalysis.severity}</Badge>
                        <p className="text-sm mt-2">{debugResult.errorAnalysis.rootCause}</p>
                        <p className="text-xs mt-2 text-muted-foreground">
                          Estimated fix time: {debugResult.estimatedFixTime}
                        </p>
                      </div>

                      {/* Solutions */}
                      <div className="space-y-3">
                        <h4 className="font-semibold">Solutions</h4>
                        {debugResult.solutions.map((solution: any, idx: number) => (
                          <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-semibold text-sm">{solution.approach}</h5>
                              <Badge variant="secondary">{solution.confidence}% confidence</Badge>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-xs font-medium">Steps:</p>
                              <ol className="text-xs list-decimal list-inside space-y-1">
                                {solution.steps.map((step: string, stepIdx: number) => (
                                  <li key={stepIdx}>{step}</li>
                                ))}
                              </ol>
                            </div>

                            {solution.codeChanges.map((change: any, changeIdx: number) => (
                              <div key={changeIdx} className="space-y-1">
                                <p className="text-xs font-medium">{change.file}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-xs text-red-500">Before:</p>
                                    <pre className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs">
                                      {change.before}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs text-green-500">After:</p>
                                    <pre className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs">
                                      {change.after}
                                    </pre>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{change.explanation}</p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Prevention Tips */}
                      {debugResult.preventionTips.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Prevention Tips</h4>
                          <ul className="space-y-1">
                            {debugResult.preventionTips.map((tip: string, idx: number) => (
                              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                <span className="text-blue-500">💡</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <Bug className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Enter error details for AI debugging
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Scanner Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Security Vulnerability Scanner
                </CardTitle>
                <CardDescription>Scan for security vulnerabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Code to Scan</Label>
                  <Textarea
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Paste your code here for security scanning..."
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dependencies (one per line)</Label>
                  <Textarea
                    value={scanDependencies}
                    onChange={(e) => setScanDependencies(e.target.value)}
                    placeholder="react@18.2.0&#10;axios@1.4.0&#10;lodash@4.17.21"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={handleSecurityScan}
                  disabled={isScanning || !scanCode}
                  className="w-full"
                  size="lg"
                >
                  {isScanning ? (
                    <>
                      <Shield className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Run Security Scan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Report</CardTitle>
                <CardDescription>
                  {securityScan ? `Risk: ${securityScan.overallRisk.toUpperCase()}` : 'Report will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {securityScan ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {/* Risk Overview */}
                      <div className={`p-4 rounded-lg ${getSeverityColor(securityScan.overallRisk)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold capitalize">{securityScan.overallRisk} Risk</h3>
                          <Badge variant="default">{securityScan.riskScore}/100</Badge>
                        </div>
                        <Progress value={securityScan.riskScore} className="h-2" />
                        <p className="text-xs mt-2">
                          {securityScan.vulnerabilities.length} vulnerabilities found
                        </p>
                      </div>

                      {/* Vulnerabilities */}
                      {securityScan.vulnerabilities.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold">Vulnerabilities</h4>
                          {securityScan.vulnerabilities.map((vuln: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded-lg ${getSeverityColor(vuln.severity)}`}>
                              <div className="flex items-start gap-2">
                                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs">{vuln.severity}</Badge>
                                    <Badge variant="secondary" className="text-xs">{vuln.category}</Badge>
                                    {vuln.cve && <Badge variant="outline" className="text-xs">{vuln.cve}</Badge>}
                                  </div>
                                  <h5 className="font-semibold text-sm mt-1">{vuln.title}</h5>
                                  <p className="text-xs mt-1">{vuln.description}</p>
                                  <div className="mt-2 p-2 bg-background/50 rounded">
                                    <p className="text-xs font-medium">Remediation:</p>
                                    <p className="text-xs">{vuln.remediation}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Code Scan Results */}
                      <div className="space-y-2">
                        <h4 className="font-semibold">Code Scan</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                            <span className="text-xs">SQL Injection</span>
                            {securityScan.codeScan.sqlInjectionRisk ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                            <span className="text-xs">XSS Risk</span>
                            {securityScan.codeScan.xssRisk ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                            <span className="text-xs">CSRF Risk</span>
                            {securityScan.codeScan.csrfRisk ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <div className="p-2 bg-muted/50 rounded flex items-center justify-between">
                            <span className="text-xs">Secrets Exposed</span>
                            {securityScan.codeScan.hardcodedSecrets.length > 0 ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Compliance */}
                      <div className="space-y-2">
                        <h4 className="font-semibold">Compliance Checks</h4>
                        <div className="flex gap-2">
                          <Badge variant={securityScan.complianceChecks.gdpr ? "default" : "destructive"}>
                            GDPR
                          </Badge>
                          <Badge variant={securityScan.complianceChecks.owasp ? "default" : "destructive"}>
                            OWASP
                          </Badge>
                          <Badge variant={securityScan.complianceChecks.pci ? "default" : "destructive"}>
                            PCI
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Enter code and dependencies to scan
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Auto Deployer Tab */}
        <TabsContent value="deployer" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-blue-500" />
                  Auto Deployer
                </CardTitle>
                <CardDescription>Deploy your project instantly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    value={deployProjectName}
                    onChange={(e) => setDeployProjectName(e.target.value)}
                    placeholder="my-awesome-app"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Files (format: path then content, separate files with ---)</Label>
                  <Textarea
                    value={deployFiles}
                    onChange={(e) => setDeployFiles(e.target.value)}
                    placeholder="index.html&#10;<html>...</html>&#10;---&#10;app.js&#10;console.log('Hello');"
                    className="font-mono text-sm min-h-[350px]"
                  />
                </div>

                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying || !deployProjectName || !deployFiles}
                  className="w-full"
                  size="lg"
                >
                  {isDeploying ? (
                    <>
                      <Rocket className="w-4 h-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Deploy Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deployment Status</CardTitle>
                <CardDescription>
                  {deploymentResult ? 
                    (deploymentResult.success ? 'Deployment successful!' : 'Deployment failed') 
                    : 'Status will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deploymentResult ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {deploymentResult.success ? (
                        <>
                          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                                Deployment Successful!
                              </h3>
                            </div>
                            <p className="text-sm text-green-600 dark:text-green-400">
                              Build time: {deploymentResult.buildTime}ms
                            </p>
                          </div>

                          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                            <p className="text-sm font-medium mb-2">Live URL:</p>
                            <a 
                              href={deploymentResult.deploymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                              {deploymentResult.deploymentUrl}
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-6 h-6 text-red-500" />
                            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
                              Deployment Failed
                            </h3>
                          </div>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {deploymentResult.error}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <h4 className="font-semibold">Build Logs</h4>
                        <ScrollArea className="h-[200px] rounded-md border">
                          <div className="p-3 font-mono text-xs space-y-1">
                            {deploymentResult.logs.map((log: string, idx: number) => (
                              <div key={idx} className="text-muted-foreground">
                                {log}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <Rocket className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Configure your deployment and click deploy
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
