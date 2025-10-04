import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload, History, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

export const BackupRestore = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      toast.error(t("toast.loginRequired"));
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
      toast.success(t("backup.createBackup") + " successful!");
    } catch (error) {
      console.error("Error creating backup:", error);
      toast.error("Failed to create backup");
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error(t("backup.selectJsonError"));
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
        `Restore ${backupData.projects.length} projects?\n\n` +
        "Warning: This will not replace existing projects, it will create new copies."
      );

      if (!confirmed) return;

      // Insert projects (creates new copies)
      let successCount = 0;
      for (const project of backupData.projects) {
        const { id, created_at, updated_at, ...projectData } = project;
        
        const { error } = await supabase.from("projects").insert({
          ...projectData,
          user_id: user?.id,
          title: `${projectData.title} ${t("backup.restored")}`
        });

        if (!error) successCount++;
      }

      toast.success(`${successCount} projects restored successfully!`);
      fetchProjects();
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast.error("Failed to restore backup");
    }

    // Reset file input
    event.target.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          {t("backup.title")}
        </CardTitle>
        <CardDescription>
          {t("backup.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Backup Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-semibold">{t("backup.currentData")}</h4>
              <p className="text-sm text-muted-foreground">
                {projects.length} {t("projects.title")}
              </p>
            </div>
            <Button onClick={handleBackup} disabled={backingUp || projects.length === 0}>
              {backingUp ? (
                <span>{t("backup.unsaved")}</span>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {t("backup.createBackup")}
                </>
              )}
            </Button>
          </div>

          {lastBackup && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-600" />
              {t("backup.lastBackup")} {lastBackup.toLocaleString()}
            </div>
          )}
        </div>

        {/* Restore Section */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <History className="w-4 h-4" />
            {t("backup.restore")}
          </h4>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              {t("backup.selectFile")}
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
                <span>{t("backup.chooseFile")}</span>
              </Button>
            </label>
          </div>
        </div>

        {/* Information */}
        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">{t("backup.importantNotes")}</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>{t("backup.note1")}</li>
            <li>{t("backup.note2")}</li>
            <li>{t("backup.note3")}</li>
            <li>{t("backup.note4")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
