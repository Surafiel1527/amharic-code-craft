import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, RotateCcw, Eye, GitCompare, Tag, Download } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeDiffViewer } from "./CodeDiffViewer";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{ v1: string; v2: string }>({ v1: '', v2: '' });
  const [exportFormat, setExportFormat] = useState<'json' | 'html'>('json');
  const { t } = useLanguage();

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
      toast.error(t('versions.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (version: Version) => {
    onRestore(version.html_code);
    toast.success(`${t('versions.restored')} ${version.version_number}`);
  };

  const handleExport = (version: Version) => {
    const data = exportFormat === 'json' 
      ? JSON.stringify(version, null, 2)
      : version.html_code;
    
    const blob = new Blob([data], { type: exportFormat === 'json' ? 'application/json' : 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `version-${version.version_number}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Version ${version.version_number} exported`);
  };

  const getComparedVersions = () => {
    const v1 = versions.find(v => v.id === compareVersions.v1);
    const v2 = versions.find(v => v.id === compareVersions.v2);
    return { v1, v2 };
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('versions.title')}
            </CardTitle>
            <CardDescription>
              {t('versions.subtitle')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              {t('versions.compare')}
            </Button>
            <Select value={exportFormat} onValueChange={(v: 'json' | 'html') => setExportFormat(v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {compareMode && compareVersions.v1 && compareVersions.v2 && (
          <div className="mb-4">
            <CodeDiffViewer
              oldCode={getComparedVersions().v1?.html_code || ''}
              newCode={getComparedVersions().v2?.html_code || ''}
              oldVersion={`${t('versions.version')} ${getComparedVersions().v1?.version_number}`}
              newVersion={`${t('versions.version')} ${getComparedVersions().v2?.version_number}`}
            />
          </div>
        )}
        
        {compareMode && (
          <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-muted rounded-lg">
            <div>
              <label className="text-xs font-medium mb-1 block">{t('versions.compareFrom')}</label>
              <Select value={compareVersions.v1} onValueChange={(v) => setCompareVersions(prev => ({ ...prev, v1: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('versions.selectVersion')} />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {t('versions.version')} {v.version_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t('versions.compareTo')}</label>
              <Select value={compareVersions.v2} onValueChange={(v) => setCompareVersions(prev => ({ ...prev, v2: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('versions.selectVersion')} />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {t('versions.version')} {v.version_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        {versions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('versions.noHistory')}</p>
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
                          {t('versions.version')} {version.version_number}
                        </Badge>
                        {version.quality_score && (
                          <Badge variant="secondary" className="text-xs">
                            {t('versions.quality')}: {version.quality_score}/100
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {version.changes_summary || t('versions.noSummary')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
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
                            <DialogTitle>{t('versions.version')} {version.version_number} {t('versions.preview')}</DialogTitle>
                            <DialogDescription>
                              {t('versions.codePreview')}
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
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport(version)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleRestore(version)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {t('versions.restore')}
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
