import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, UserMinus, Globe, Github, Twitter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface UserProfileCardProps {
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    bio: string | null;
    website: string | null;
    github: string | null;
    twitter: string | null;
  };
  projectCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  onFollowChange?: () => void;
}

export const UserProfileCard = ({
  profile,
  projectCount,
  followerCount,
  followingCount,
  isFollowing,
  onFollowChange,
}: UserProfileCardProps) => {
  const { user } = useAuth();
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const isOwnProfile = user?.id === profile.id;

  const handleFollowToggle = async () => {
    if (!user) {
      toast.error("እባክዎ መጀመሪያ ይግቡ");
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);

        if (error) throw error;
        toast.success("የመከተል ተቋርጧል");
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: profile.id,
          });

        if (error) throw error;
        toast.success("በተሳካ ሁኔታ ይከተላሉ");
      }
      onFollowChange?.();
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error("ተግባሩ አልተሳካም");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const getInitials = () => {
    if (profile.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    // SECURITY: Never use email for non-owners
    if (isOwnProfile && profile.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-2xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">
              {profile.full_name || (isOwnProfile ? profile.email : 'Anonymous User')}
            </h2>
            {profile.bio && (
              <p className="text-muted-foreground text-sm max-w-md">
                {profile.bio}
              </p>
            )}
          </div>

          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold">{projectCount}</div>
              <div className="text-xs text-muted-foreground">ፕሮጀክቶች</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{followerCount}</div>
              <div className="text-xs text-muted-foreground">ተከታዮች</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{followingCount}</div>
              <div className="text-xs text-muted-foreground">እየተከተሉ</div>
            </div>
          </div>

          {(profile.website || profile.github || profile.twitter) && (
            <div className="flex gap-2 flex-wrap justify-center">
              {profile.website && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                    ድረ-ገፅ
                  </a>
                </Button>
              )}
              {profile.github && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                </Button>
              )}
              {profile.twitter && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </a>
                </Button>
              )}
            </div>
          )}

          {!isOwnProfile && (
            <Button
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
              variant={isFollowing ? "outline" : "default"}
              className="w-full max-w-xs"
            >
              {isFollowing ? (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  መከተል አቁም
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  ተከተል
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
