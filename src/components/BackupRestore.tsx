import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload, History, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const BackupRestore = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const handleBackup = async () => {
    if (!user) {
      toast.error("እባክዎ ይግቡ");
      return;
    }

    setBackingUp(true);
    try {
      // Create backup data
      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        userId: user.id,
        projects: projects,
      };

      // Convert to JSON and create blob
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastBackup(new Date());
      toast.success("ምትኪ በተሳካ ሁኔታ ተፈጠረ!");
    } catch (error) {
      console.error("Error creating backup:", error);
      toast.error("ምትኪ መፍጠር አልተቻለም");
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error("እባክዎ የምትኪ JSON ፋይል ይምረጡ");
      return;
    }

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.projects || !Array.isArray(backupData.projects)) {
        throw new Error("Invalid backup format");
      }

      // Restore confirmation
      const confirmed = window.confirm(
        `${backupData.projects.length} ፕሮጀክቶችን ወደነበሩበት መመለስ ይፈልጋሉ?\n\n` +
        "ማስጠንቀቂያ: ይህ አሁን ያሉ ፕሮጀክቶችን አይተካም፣ በምትኩ አዳዲስ ቅጂዎችን ይፈጥራል።"
      );

      if (!confirmed) return;

      // Insert projects (creates new copies)
      let successCount = 0;
      for (const project of backupData.projects) {
        const { id, created_at, updated_at, ...projectData } = project;
        
        const { error } = await supabase.from("projects").insert({
          ...projectData,
          user_id: user?.id,
          title: `${projectData.title} (የተመለሰ)`
        });

        if (!error) successCount++;
      }

      toast.success(`${successCount} ፕሮጀክቶች በተሳካ ሁኔታ ተመልሰዋል!`);
      fetchProjects();
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast.error("ምትኪን መመለስ አልተቻለም");
    }

    // Reset file input
    event.target.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          ምትኪ እና መመለሻ
        </CardTitle>
        <CardDescription>
          የእርስዎን ሁሉንም ፕሮጀክቶች ምትኪ ያድርጉ እና ያደራጁ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Backup Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-semibold">የአሁኑ ዳታ</h4>
              <p className="text-sm text-muted-foreground">
                {projects.length} ፕሮጀክቶች ምትኪ ለማድረግ ዝግጁ
              </p>
            </div>
            <Button onClick={handleBackup} disabled={backingUp || projects.length === 0}>
              {backingUp ? (
                <span>መቀመጥ እየተጠበቀ ነው...</span>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  ምትኪ ፍጠር
                </>
              )}
            </Button>
          </div>

          {lastBackup && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-600" />
              የመጨረሻ ምትኪ: {lastBackup.toLocaleString('am-ET')}
            </div>
          )}
        </div>

        {/* Restore Section */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <History className="w-4 h-4" />
            ከምትኪ መመለስ
          </h4>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              የምትኪ JSON ፋይልን ይምረጡ
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="hidden"
              id="restore-input"
            />
            <label htmlFor="restore-input">
              <Button variant="outline" asChild>
                <span>ፋይል ምረጥ</span>
              </Button>
            </label>
          </div>
        </div>

        {/* Information */}
        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">አስፈላጊ መረጃ</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>ምትኪዎች ሁሉንም የፕሮጀክት ውሂብ እና ኮድ ይይዛሉ</li>
            <li>መመለስ አሁን ያሉ ፕሮጀክቶችን አይተካም</li>
            <li>የተመለሱ ፕሮጀክቶች በርዕስ ላይ "(የተመለሰ)" ያላቸው ናቸው</li>
            <li>መደበኛ ምትኪዎችን ያስቀምጡ ለአደጋ መቋቋም</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
