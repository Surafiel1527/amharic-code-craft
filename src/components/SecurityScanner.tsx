import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Vulnerability {
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  description: string;
  location: string;
  recommendation: string;
}

interface SecurityScannerProps {
  code: string;
}

export const SecurityScanner = ({ code }: SecurityScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    vulnerabilities: Vulnerability[];
    summary: string;
  } | null>(null);

  const handleScan = async () => {
    if (!code) {
      toast.error("ምንም የሚተነተን ኮድ የለም");
      return;
    }

    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("security-scan", {
        body: { code },
      });

      if (error) {
        if (error.message.includes("429")) {
          toast.error("በጣም ብዙ ጥያቄዎች። እባክዎ ትንሽ ይቆዩ።");
        } else if (error.message.includes("402")) {
          toast.error("ክፍያ ያስፈልጋል። እባክዎ የእርስዎን መለያ ይሙሉ።");
        } else {
          toast.error("ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።");
        }
        throw error;
      }

      setResult(data);
      toast.success("የደህንነት ቅኝት ተጠናቋል!");
    } catch (error) {
      console.error("Error scanning:", error);
    } finally {
      setScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-600";
      case "high": return "bg-orange-600";
      case "medium": return "bg-yellow-600";
      case "low": return "bg-blue-600";
      default: return "bg-gray-600";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          የደህንነት ቅኝት
        </CardTitle>
        <CardDescription>
          ኮዱን በራስ ሰር በሚታወቁ የደህንነት ስጋቶች ቅኝት ያድርጉ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleScan}
          disabled={scanning || !code}
          className="w-full mb-6"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              እየተቃኘ ነው...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              ቅኝት ጀምር
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-6">
            {/* Security Score */}
            <div className="text-center p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">የደህንነት ነጥብ</p>
              <p className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}
                <span className="text-2xl">/100</span>
              </p>
              <p className="text-sm mt-4 text-muted-foreground">{result.summary}</p>
            </div>

            {/* Vulnerabilities List */}
            {result.vulnerabilities.length > 0 ? (
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  የተገኙ ስጋቶች ({result.vulnerabilities.length})
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {result.vulnerabilities.map((vuln, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <XCircle className={`w-5 h-5 mt-0.5 ${
                              vuln.severity === "critical" ? "text-red-600" :
                              vuln.severity === "high" ? "text-orange-600" :
                              vuln.severity === "medium" ? "text-yellow-600" :
                              "text-blue-600"
                            }`} />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge className={getSeverityColor(vuln.severity)}>
                                  {vuln.severity.toUpperCase()}
                                </Badge>
                                <span className="font-semibold">{vuln.type}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {vuln.description}
                              </p>
                              <div className="bg-muted p-3 rounded text-xs">
                                <p className="font-semibold mb-1">አካባቢ:</p>
                                <code className="text-xs">{vuln.location}</code>
                              </div>
                              <div className="bg-green-50 dark:bg-green-950 p-3 rounded text-xs">
                                <p className="font-semibold mb-1 text-green-800 dark:text-green-200">
                                  መፍትሄ:
                                </p>
                                <p className="text-green-700 dark:text-green-300">
                                  {vuln.recommendation}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center p-6 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="font-semibold text-green-800 dark:text-green-200">
                  ምንም ስጋት አልተገኘም!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  ኮድዎ ደህንነቱ የተጠበቀ ይመስላል
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
