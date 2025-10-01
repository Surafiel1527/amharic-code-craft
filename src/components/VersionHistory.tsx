import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Version {
  id: string;
  version_number: number;
  html_code: string;
  changes_summary: string | null;
  quality_score: number | null;
  performance_score: number | null;
  created_at: string;
}

interface VersionHistoryProps {
  projectId: string;
  onRestore: (code: string) => void;
}

export const VersionHistory = ({ projectId, onRestore }: VersionHistoryProps) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [projectId]);

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast.error("ስሪቶችን ማምጣት አልተቻለም");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (version: Version) => {
    onRestore(version.html_code);
    toast.success(`ወደ ስሪት ${version.version_number} ተመልሷል`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          የስሪት ታሪክ
        </CardTitle>
        <CardDescription>
          የፕሮጀክትዎን ቀደም ያሉ ስሪቶች ይመልከቱ እና ያገግሙ
        </CardDescription>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>ምንም የስሪት ታሪክ የለም</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="p-4 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">
                          ስሪት {version.version_number}
                        </Badge>
                        {version.quality_score && (
                          <Badge variant="secondary" className="text-xs">
                            ጥራት: {version.quality_score}/100
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {version.changes_summary || 'ምንም ማጠቃለያ የለም'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(version.created_at).toLocaleString('am-ET')}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedVersion(version)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>ስሪት {version.version_number}</DialogTitle>
                            <DialogDescription>
                              የኮድ ቅድመ እይታ
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[500px]">
                            <pre className="text-xs bg-muted p-4 rounded-lg">
                              {version.html_code}
                            </pre>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleRestore(version)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        መልስ
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
