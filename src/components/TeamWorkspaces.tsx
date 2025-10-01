import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Mail, Trash2, Crown, Shield, User as UserIcon } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  description: string;
  plan: string;
  max_members: number;
  owner_id: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export default function TeamWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    description: "",
    plan: "free"
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchMembers(selectedWorkspace.id);
    }
  }, [selectedWorkspace]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("team_workspaces")
      .select("*")
      .or(`owner_id.eq.${user.id},id.in.(select workspace_id from team_members where user_id = ${user.id})`);

    if (error) {
      toast({ title: "Error fetching workspaces", variant: "destructive" });
    } else {
      setWorkspaces(data || []);
      if (data && data.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(data[0]);
      }
    }
    setLoading(false);
  };

  const fetchMembers = async (workspaceId: string) => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (!error) {
      setMembers(data || []);
    }
  };

  const handleCreateWorkspace = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please login", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("team_workspaces")
      .insert({
        ...newWorkspace,
        owner_id: user.id,
        max_members: newWorkspace.plan === "free" ? 5 : newWorkspace.plan === "pro" ? 20 : 100
      });

    if (error) {
      toast({ title: "Error creating workspace", variant: "destructive" });
    } else {
      toast({ title: "Workspace created successfully!" });
      setIsCreateDialogOpen(false);
      fetchWorkspaces();
      setNewWorkspace({ name: "", description: "", plan: "free" });
    }
  };

  const handleInviteMember = async () => {
    if (!selectedWorkspace) return;

    // In a real implementation, this would send an email invitation
    // For now, we'll show a placeholder message
    toast({ 
      title: "Invitation Sent", 
      description: `Invitation email sent to ${inviteEmail}`
    });
    
    setIsInviteDialogOpen(false);
    setInviteEmail("");
    setInviteRole("member");
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast({ title: "Error removing member", variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      if (selectedWorkspace) {
        fetchMembers(selectedWorkspace.id);
      }
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from("team_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      toast({ title: "Error updating role", variant: "destructive" });
    } else {
      toast({ title: "Role updated" });
      if (selectedWorkspace) {
        fetchMembers(selectedWorkspace.id);
      }
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Team Workspaces</h2>
          <p className="text-muted-foreground">Collaborate with your team members</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team Workspace</DialogTitle>
              <DialogDescription>Set up a new workspace for your team</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Workspace Name"
                value={newWorkspace.name}
                onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={newWorkspace.description}
                onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
              />
              <Select
                value={newWorkspace.plan}
                onValueChange={(value) => setNewWorkspace({ ...newWorkspace, plan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (5 members)</SelectItem>
                  <SelectItem value="pro">Pro (20 members)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (100 members)</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreateWorkspace} className="w-full">
                Create Workspace
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Workspaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspaces.map((workspace) => (
              <Button
                key={workspace.id}
                variant={selectedWorkspace?.id === workspace.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedWorkspace(workspace)}
              >
                <Users className="h-4 w-4 mr-2" />
                {workspace.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          {selectedWorkspace ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedWorkspace.name}</CardTitle>
                    <CardDescription>{selectedWorkspace.description}</CardDescription>
                  </div>
                  <Badge>{selectedWorkspace.plan}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="members">
                  <TabsList>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="members" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Team Members ({members.length})</h3>
                      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Mail className="h-4 w-4 mr-2" />
                            Invite
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Team Member</DialogTitle>
                            <DialogDescription>Send an invitation to join this workspace</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              type="email"
                              placeholder="Email address"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={handleInviteMember} className="w-full">
                              Send Invitation
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">User {member.user_id.substring(0, 8)}</div>
                                <div className="text-sm text-muted-foreground">{member.user_id}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getRoleIcon(member.role)}
                                <span className="capitalize">{member.role}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(member.joined_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Select
                                  value={member.role}
                                  onValueChange={(value) => handleChangeRole(member.id, value)}
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="settings">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Workspace Settings</h3>
                        <p className="text-sm text-muted-foreground">
                          Configure workspace preferences and limits
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <div className="font-medium">Member Limit</div>
                            <div className="text-sm text-muted-foreground">
                              Current: {members.length} / {selectedWorkspace.max_members}
                            </div>
                          </div>
                          <Button variant="outline">Upgrade Plan</Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Select a workspace to view details</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}