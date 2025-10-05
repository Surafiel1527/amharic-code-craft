import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Smartphone, Tablet, Trash2, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  last_activity_at: string;
  created_at: string;
}

export const SessionManager = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", user.user.id)
        .order("last_activity_at", { ascending: false });

      if (error) throw error;

      setSessions(data || []);
      
      // Detect current session (simplified - in production, you'd track this properly)
      const { data: { session } } = await supabase.auth.getSession();
      if (session && data && data.length > 0) {
        setCurrentSessionId(data[0].id); // Most recent session is likely current
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("user_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      // Log audit event
      const { data: user } = await supabase.auth.getUser();
      await supabase.rpc("log_audit_event", {
        p_user_id: user.user?.id,
        p_action: "revoke_session",
        p_resource_type: "user_session",
        p_resource_id: sessionId,
        p_severity: "warning",
      });

      toast.success("Session revoked");
      
      if (sessionId === currentSessionId) {
        // If revoking current session, sign out
        await supabase.auth.signOut();
      } else {
        fetchSessions();
      }
    } catch (error) {
      console.error("Error revoking session:", error);
      toast.error("Failed to revoke session");
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("user_sessions")
        .delete()
        .eq("user_id", user.user?.id)
        .neq("id", currentSessionId || "");

      if (error) throw error;

      // Log audit event
      await supabase.rpc("log_audit_event", {
        p_user_id: user.user?.id,
        p_action: "revoke_all_sessions",
        p_resource_type: "user_session",
        p_severity: "warning",
      });

      toast.success("All other sessions revoked");
      fetchSessions();
    } catch (error) {
      console.error("Error revoking sessions:", error);
      toast.error("Failed to revoke sessions");
    }
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone className="h-4 w-4" />;
    } else if (ua.includes("tablet") || ua.includes("ipad")) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return "Unknown Device";
    
    // Simplified device detection
    if (userAgent.includes("Chrome")) return "Chrome Browser";
    if (userAgent.includes("Firefox")) return "Firefox Browser";
    if (userAgent.includes("Safari")) return "Safari Browser";
    if (userAgent.includes("Edge")) return "Edge Browser";
    
    return "Web Browser";
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const hoursUntilExpiry = (expiryTime - now) / (1000 * 60 * 60);
    return hoursUntilExpiry < 2; // Less than 2 hours
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Manage your active login sessions across all devices (24-hour timeout)
            </CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              onClick={revokeAllOtherSessions}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Revoke All Others
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active sessions</p>
              </div>
            ) : (
              sessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                const expiringSoon = isExpiringSoon(session.expires_at);
                
                return (
                  <Card key={session.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3 flex-1">
                          {getDeviceIcon(session.user_agent)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {getDeviceInfo(session.user_agent)}
                              </span>
                              {isCurrent && (
                                <Badge variant="outline" className="text-success">
                                  Current
                                </Badge>
                              )}
                              {expiringSoon && (
                                <Badge variant="outline" className="text-warning">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Expiring Soon
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {session.ip_address && (
                                <p className="truncate">IP: {session.ip_address}</p>
                              )}
                              <p>
                                Last active: {new Date(session.last_activity_at).toLocaleString()}
                              </p>
                              <p>
                                Expires: {new Date(session.expires_at).toLocaleString()}
                              </p>
                              <p className="text-xs truncate">
                                Session ID: {session.id}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeSession(session.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
