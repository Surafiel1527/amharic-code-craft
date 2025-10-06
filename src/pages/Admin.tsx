import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDynamicCustomizations } from "@/hooks/useDynamicCustomizations";
import { DynamicSlot } from "@/components/DynamicSlot";
import { DynamicComponent } from "@/components/DynamicComponent";
import { DynamicContainer } from "@/components/DynamicContainer";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, FileText, MessageSquare, Shield, Brain, Sparkles, LogOut, Menu, Edit3, Check, Info, Eye, Code, Lock, Key, Activity } from "lucide-react";
import { toast } from "sonner";
import { AIAnalytics } from "@/components/AIAnalytics";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SelfHealingMonitor } from "@/components/SelfHealingMonitor";
import AdminSelfModifyChat from "@/components/AdminSelfModifyChat";
import AdminCustomizationsList from "@/components/AdminCustomizationsList";
import { AdminSecurityDashboard } from "@/components/AdminSecurityDashboard";
import { SecureAPIKeyManager } from "@/components/SecureAPIKeyManager";
import { SessionManager } from "@/components/SessionManager";
import { PreviewModeToggle } from "@/components/PreviewModeToggle";
import { PreviewBanner } from "@/components/PreviewBanner";
import { ModificationHistory } from "@/components/ModificationHistory";
import { SnapshotManager } from "@/components/SnapshotManager";
import { ThemeGallery } from "@/components/ThemeGallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEditMode } from "@/contexts/EditModeContext";
import { InspectorPanel } from "@/components/InspectorPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalConversations: number;
}

function AdminContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [previewMode, setPreviewMode] = useState(false);
  const [previewSnapshotId, setPreviewSnapshotId] = useState<string | undefined>(undefined);
  const [previewSnapshotName, setPreviewSnapshotName] = useState<string>('');
  const [pendingCount, setPendingCount] = useState(0);
  const { isEditMode, setIsEditMode } = useEditMode();
  const hasCheckedAuthRef = useRef(false);
  
  // Debug preview mode changes
  useEffect(() => {
    logger.debug('Preview mode changed', { previewMode, previewSnapshotId });
  }, [previewMode, previewSnapshotId]);
  
  const { getDynamicStyles, getDynamicInlineStyles, isVisible, customizations } = useDynamicCustomizations(previewMode, previewSnapshotId, '/admin');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalProjects: 0, totalConversations: 0 });
  const [loading, setLoading] = useState(true);

  // Count pending customizations
  useEffect(() => {
    const count = customizations.filter(c => c.status === 'pending').length;
    setPendingCount(count);
  }, [customizations]);

  // Handle snapshot preview
  const handleSnapshotPreview = (snapshotId: string, snapshotName: string) => {
    setPreviewSnapshotId(snapshotId);
    setPreviewSnapshotName(snapshotName);
    setPreviewMode(true);
  };

  // Handle preview mode toggle - clear snapshot preview when toggling off
  const handlePreviewToggle = () => {
    if (previewMode) {
      // Turning off preview mode - clear snapshot preview
      setPreviewSnapshotId(undefined);
      setPreviewSnapshotName('');
    }
    setPreviewMode(!previewMode);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    // Only check authorization after both auth and role are fully loaded
    if (authLoading || roleLoading) {
      return;
    }

    if (!user) {
      return; // Will be handled by the auth redirect effect
    }

    if (isAdmin === null) {
      return; // Still loading role
    }

    // Only check authorization once on initial mount
    if (!hasCheckedAuthRef.current) {
      hasCheckedAuthRef.current = true;
      if (!isAdmin) {
        toast.error(t("toast.notAuthorized"));
        navigate("/");
        return;
      }
    }
    
    // Only fetch data if user is admin
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [authLoading, roleLoading, isAdmin, user, navigate, t]);

  const fetchDashboardData = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        throw profilesError;
      }

      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      const { count: conversationsCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      setUsers(profilesData || []);
      setStats({
        totalUsers: profilesData?.length || 0,
        totalProjects: projectsCount || 0,
        totalConversations: conversationsCount || 0,
      });
    } catch (error) {
      logger.error('Error fetching dashboard data', error);
      toast.error(t("toast.dataFetchError"));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole });

      if (error) throw error;
      toast.success(t("toast.roleUpdated"));
    } catch (error) {
      logger.error('Error updating role', error);
      toast.error(t("toast.roleUpdateError"));
    }
  };

  // Show loading state while checking auth and permissions
  if (authLoading || roleLoading || loading || !user || isAdmin === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          <Skeleton className="h-12 w-48 sm:w-64" />
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            <Skeleton className="h-24 sm:h-32" />
            <Skeleton className="h-24 sm:h-32" />
            <Skeleton className="h-24 sm:h-32" />
          </div>
          <Skeleton className="h-64 sm:h-96" />
        </div>
      </div>
    );
  }

  // If not admin after loading, don't render anything (redirect will happen)
  if (!isAdmin) {
    return null;
  }

  // Get dynamic inline styles for AdminPage component
  logger.debug('Checking for dynamic styles');
  const dynamicInlineStyles = getDynamicInlineStyles('AdminPage');
  logger.debug('Received inline styles', { styles: dynamicInlineStyles });
  
  // Fallback gradient
  const defaultGradient = 'linear-gradient(to bottom right, hsl(138, 76%, 97%), hsl(141, 84%, 93%), hsl(141, 79%, 85%))';

  return (
    <div 
      className="min-h-screen p-4 sm:p-8"
      style={Object.keys(dynamicInlineStyles).length > 0 ? dynamicInlineStyles : { background: defaultGradient }}
    >
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Edit Mode Alert */}
        {isEditMode && (
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <Edit3 className="h-4 w-4" />
            <AlertDescription>
              ✏️ <strong>Edit Mode Active:</strong> Click on any highlighted element to edit it. 
              Click "Exit Edit Mode" when done.
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Mode Banner */}
        {previewMode && !previewSnapshotId && (
          <PreviewBanner 
            pendingCount={pendingCount}
            affectedPages={[...new Set(customizations.filter(c => c.status === 'pending').map((c: any) => c.applied_changes?.page).filter(Boolean))]}
          />
        )}

        {/* Snapshot Preview Alert */}
        {previewMode && previewSnapshotId && (
          <Alert className="border-primary bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <span className="text-sm">
                🔍 <strong>Previewing Snapshot:</strong> "{previewSnapshotName}". 
                {' '}Toggle off Preview Mode to return to your live settings.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <DynamicComponent name="Button-BackToHome">
              <Button variant="outline" size="icon" onClick={() => navigate("/")} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </DynamicComponent>
            <div className="min-w-0 flex-1">
              <DynamicComponent name="Header-Title">
                <h1 className="text-xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                  {t("admin.title")}
                </h1>
              </DynamicComponent>
              <DynamicComponent name="Header-Subtitle">
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm hidden sm:block">{t("admin.subtitle")}</p>
              </DynamicComponent>
            </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/builder")}
              className="gap-2"
            >
              <Code className="h-4 w-4" />
              {t("adminPage.aiBuilder")}
            </Button>
            <DynamicComponent name="Button-EditPage">
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="gap-2"
              >
                {isEditMode ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t("adminPage.exitEditMode")}
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4" />
                    {t("adminPage.editPage")}
                  </>
                )}
              </Button>
            </DynamicComponent>
            <PreviewModeToggle
              isPreviewMode={previewMode}
              onToggle={handlePreviewToggle}
              pendingCount={pendingCount}
              affectedPages={[...new Set(customizations.filter(c => c.status === 'pending').map((c: any) => c.applied_changes?.page).filter(Boolean))]}
            />
            <DynamicSlot name="header-actions">
              {isVisible('NotificationCenter') && <NotificationCenter />}
            </DynamicSlot>
            <DynamicComponent name="Button-SignOut">
              <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                {t("admin.signOut")}
              </Button>
            </DynamicComponent>
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/builder")}
                  className="gap-2 w-full"
                >
                  <Code className="h-4 w-4" />
                  {t("adminPage.aiBuilder")}
                </Button>
                <Button
                  variant={isEditMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="gap-2 w-full"
                >
                  {isEditMode ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t("adminPage.exitEditMode")}
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4" />
                      {t("adminPage.editPage")}
                    </>
                  )}
                </Button>
                <PreviewModeToggle 
                  isPreviewMode={previewMode}
                  onToggle={handlePreviewToggle}
                  pendingCount={pendingCount}
                  affectedPages={[...new Set(customizations.filter(c => c.status === 'pending').map((c: any) => c.applied_changes?.page).filter(Boolean))]}
                />
                <DynamicSlot name="mobile-menu">
                  {isVisible('NotificationCenter') && <NotificationCenter />}
                </DynamicSlot>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                  {t("admin.signOut")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Stats Cards - Wrapped for AI reordering */}
        <DynamicContainer className="grid gap-6 md:grid-cols-3">
          <DynamicComponent name="StatsCard-Users" defaultOrder={1}>
            <Card className="glass-effect border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <DynamicComponent name="StatsCard-Users-Label">
                  <CardTitle className="text-sm font-medium">{t("admin.totalUsers")}</CardTitle>
                </DynamicComponent>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <DynamicComponent name="StatsCard-Users-Value">
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </DynamicComponent>
              </CardContent>
            </Card>
          </DynamicComponent>

          <DynamicComponent name="StatsCard-Projects" defaultOrder={2}>
            <Card className="glass-effect border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <DynamicComponent name="StatsCard-Projects-Label">
                  <CardTitle className="text-sm font-medium">{t("admin.totalProjects")}</CardTitle>
                </DynamicComponent>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <DynamicComponent name="StatsCard-Projects-Value">
                  <div className="text-2xl font-bold">{stats.totalProjects}</div>
                </DynamicComponent>
              </CardContent>
            </Card>
          </DynamicComponent>

          <DynamicComponent name="StatsCard-Conversations" defaultOrder={3}>
            <Card className="glass-effect border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <DynamicComponent name="StatsCard-Conversations-Label">
                  <CardTitle className="text-sm font-medium">{t("admin.totalConversations")}</CardTitle>
                </DynamicComponent>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <DynamicComponent name="StatsCard-Conversations-Value">
                  <div className="text-2xl font-bold">{stats.totalConversations}</div>
                </DynamicComponent>
              </CardContent>
            </Card>
          </DynamicComponent>
        </DynamicContainer>

        {/* Dynamic Extra Stats Slot */}
        <DynamicSlot name="stats-extra" className="grid gap-6 md:grid-cols-3" />

        {/* Inspector Panel - only visible in Edit Mode when component is selected */}
        <InspectorPanel />

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-7 h-auto gap-2">
            <TabsTrigger value="users" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t("adminPage.usersAndStats")}</span>
              <span className="sm:hidden">{t("adminPage.users")}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Security</span>
              <span className="sm:hidden">Security</span>
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Key className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">API Keys</span>
              <span className="sm:hidden">Keys</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sessions</span>
              <span className="sm:hidden">Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t("adminPage.aiSystem")}</span>
              <span className="sm:hidden">{t("adminPage.ai")}</span>
            </TabsTrigger>
            <TabsTrigger value="healing" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t("adminPage.selfHealing")}</span>
              <span className="sm:hidden">{t("adminPage.healing")}</span>
            </TabsTrigger>
            <TabsTrigger value="customize" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t("adminPage.selfModify")}</span>
              <span className="sm:hidden">{t("adminPage.modify")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Users Table */}
            <Card className="glass-effect border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("admin.usersManagement")}
                </CardTitle>
                <CardDescription>
                  {t("admin.usersManagementDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">{t("admin.email")}</TableHead>
                      <TableHead className="min-w-[120px] hidden sm:table-cell">{t("admin.fullName")}</TableHead>
                      <TableHead className="min-w-[120px] hidden md:table-cell">{t("admin.registeredDate")}</TableHead>
                      <TableHead className="min-w-[100px]">{t("admin.role")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">{user.email}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{user.full_name || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs sm:text-sm">{new Date(user.created_at).toLocaleDateString('am-ET')}</TableCell>
                        <TableCell>
                          <Select
                            onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'user')}
                            defaultValue="user"
                          >
                            <SelectTrigger className="w-24 sm:w-32 text-xs sm:text-sm">
                              <SelectValue placeholder={t("admin.selectRole")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">{t("admin.roleUser")}</SelectItem>
                              <SelectItem value="admin">{t("admin.roleAdmin")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <AdminSecurityDashboard />
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <SecureAPIKeyManager />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <SessionManager />
          </TabsContent>

          <TabsContent value="ai">
            <AIAnalytics />
          </TabsContent>

          <TabsContent value="healing">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {t("adminPage.selfHealingTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("adminPage.selfHealingDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <DynamicComponent name="Button-TestSuite">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate("/ai-test")}
                        className="gap-2"
                      >
                        <Brain className="w-4 h-4" />
                        Open Test Suite
                      </Button>
                    </DynamicComponent>
                  </div>
                </CardContent>
              </Card>
              <SelfHealingMonitor />
            </div>
          </TabsContent>

          <TabsContent value="customize" className="space-y-4">
            <Tabs defaultValue="chat" className="flex-1">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="chat">AI Modify</TabsTrigger>
                <TabsTrigger value="themes">Themes</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="versions">Versions</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <AdminSelfModifyChat onCustomizationApplied={() => {
                    toast.success("🎨 Changes ready for review");
                  }} />
                  <AdminCustomizationsList />
                </div>
              </TabsContent>

              <TabsContent value="themes" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Dashboard Themes</h2>
                    <p className="text-muted-foreground">
                      Browse and apply saved dashboard configurations. Each theme captures a complete snapshot of your customizations.
                    </p>
                  </div>
                  <ThemeGallery 
                    onPreview={handleSnapshotPreview}
                  />
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <ModificationHistory />
              </TabsContent>

              <TabsContent value="versions" className="mt-6">
                <SnapshotManager onPreview={handleSnapshotPreview} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Admin() {
  return <AdminContent />;
}
