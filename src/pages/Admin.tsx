import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDynamicCustomizations } from "@/hooks/useDynamicCustomizations";
import { DynamicSlot } from "@/components/DynamicSlot";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, FileText, MessageSquare, Shield, Brain, Sparkles, LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { AIAnalytics } from "@/components/AIAnalytics";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SelfHealingMonitor } from "@/components/SelfHealingMonitor";
import AdminSelfModifyChat from "@/components/AdminSelfModifyChat";
import AdminCustomizationsList from "@/components/AdminCustomizationsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

export default function Admin() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { getDynamicStyles, isVisible } = useDynamicCustomizations();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalProjects: 0, totalConversations: 0 });
  const [loading, setLoading] = useState(true);

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

    if (!isAdmin) {
      toast.error(t("toast.notAuthorized"));
      navigate("/");
    } else {
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
      console.error('Error fetching dashboard data:', error);
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
      console.error('Error updating role:', error);
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

  // Get dynamic styles for AdminPage component (check multiple possible component names)
  const dynamicStyles = getDynamicStyles('AdminPage') || getDynamicStyles('Admin') || getDynamicStyles('main container');
  const backgroundStyles = dynamicStyles || 'bg-gradient-to-br from-green-50 via-green-100 to-green-200 dark:from-green-950 dark:via-green-900 dark:to-green-800';

  return (
    <div className={`min-h-screen ${backgroundStyles} p-4 sm:p-8`}>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <Button variant="outline" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent truncate">
                {t("admin.title")}
              </h1>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm hidden sm:block">{t("admin.subtitle")}</p>
            </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <DynamicSlot name="header-actions">
              {isVisible('NotificationCenter') && <NotificationCenter />}
            </DynamicSlot>
            <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              {t("admin.signOut")}
            </Button>
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

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalUsers")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalProjects")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalConversations")}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Extra Stats Slot */}
        <DynamicSlot name="stats-extra" className="grid gap-6 md:grid-cols-3" />

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-2">
            <TabsTrigger value="users" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Users & Stats</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">AI System</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="healing" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Self-Healing</span>
              <span className="sm:hidden">Healing</span>
            </TabsTrigger>
            <TabsTrigger value="customize" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Self-Modify</span>
              <span className="sm:hidden">Modify</span>
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

          <TabsContent value="ai">
            <AIAnalytics />
          </TabsContent>

          <TabsContent value="healing">
            <SelfHealingMonitor />
          </TabsContent>

          <TabsContent value="customize" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <AdminSelfModifyChat onCustomizationApplied={() => {
                toast.success("🎨 Changes ready for review");
              }} />
              <AdminCustomizationsList />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
