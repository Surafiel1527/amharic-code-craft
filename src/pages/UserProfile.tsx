import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfileCard } from "@/components/UserProfileCard";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  bio: string | null;
  website: string | null;
  github: string | null;
  twitter: string | null;
}

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProfileData();
    }
  }, [userId]);

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user's public projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      setProjects(projectsData || []);

      // Fetch follower count
      const { count: followers } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      setFollowerCount(followers || 0);

      // Fetch following count
      const { count: following } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      setFollowingCount(following || 0);

      // Check if current user is following
      if (user) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">ተጠቃሚ አልተገኘም</h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            ወደ መነሻ ተመለስ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          ተመለስ
        </Button>

        <div className="max-w-6xl mx-auto space-y-6">
          <UserProfileCard
            profile={profile}
            projectCount={projects.length}
            followerCount={followerCount}
            followingCount={followingCount}
            isFollowing={isFollowing}
            onFollowChange={fetchProfileData}
          />

          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="projects">
                ፕሮጀክቶች ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="activity">
                እንቅስቃሴ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-6">
              {projects.length > 0 ? (
                <ProjectsGrid
                  projects={projects}
                  onLoadProject={() => {}}
                  onProjectsChange={fetchProfileData}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>ገና ምንም ይፋ የሆነ ፕሮጀክት የለም</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <div className="text-center py-12 text-muted-foreground">
                <p>እንቅስቃሴ ታሪክ በቅርቡ ይጨመራል</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
