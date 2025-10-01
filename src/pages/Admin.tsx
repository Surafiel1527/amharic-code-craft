import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, FileText, MessageSquare, Shield } from "lucide-react";
import { toast } from "sonner";
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
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id);
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalProjects: 0, totalConversations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("የአስተዳዳሪ መብት የለዎትም");
      navigate("/");
    }
  }, [roleLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    try {
      // Fetch users from profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch stats
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
      toast.error("መረጃ በማምጣት ላይ ስህተት ተፈጥሯል");
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
      toast.success("የተጠቃሚ ሚና ተቀይሯል");
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error("ሚና በመቀየር ላይ ስህተት ተፈጥሯል");
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                የአስተዳዳሪ ዳሽቦርድ
              </h1>
              <p className="text-muted-foreground mt-1">የስርዓት አጠቃላይ እይታ እና የተጠቃሚ አስተዳደር</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ጠቅላላ ተጠቃሚዎች</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ጠቅላላ ፕሮጀክቶች</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ጠቅላላ ውይይቶች</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="glass-effect border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              የተጠቃሚዎች አስተዳደር
            </CardTitle>
            <CardDescription>
              የተጠቃሚዎችን ሚናዎች ይመልከቱ እና ያስተዳድሩ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ኢሜል</TableHead>
                  <TableHead>ሙሉ ስም</TableHead>
                  <TableHead>የተመዘገበበት ቀን</TableHead>
                  <TableHead>ሚና</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name || '-'}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString('am-ET')}</TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'user')}
                        defaultValue="user"
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="ሚና ይምረጡ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">ተጠቃሚ</SelectItem>
                          <SelectItem value="admin">አስተዳዳሪ</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
