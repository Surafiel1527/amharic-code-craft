import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("እባክዎ ሁሉንም መረጃዎች ይሙሉ");
      return;
    }

    if (password.length < 6) {
      toast.error("የይለፍ ቃል ቢያንስ 6 ቁምፊዎች መሆን አለበት");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("ይህ ኢሜል አስቀድሞ ተመዝግቧል። እባክዎ ይግቡ።");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("መለያ በተሳካ ሁኔታ ተፈጥሯል! እባክዎ ይግቡ።");
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("ምዝገባ አልተሳካም። እባክዎ እንደገና ይሞክሩ።");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("እባክዎ ኢሜል እና የይለፍ ቃል ያስገቡ");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login")) {
          toast.error("የተሳሳተ ኢሜል ወይም የይለፍ ቃል");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("በተሳካ ሁኔታ ገብተዋል!");
      navigate("/");
    } catch (error) {
      console.error("Signin error:", error);
      toast.error("መግባት አልተሳካም። እባክዎ እንደገና ይሞክሩ።");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(271_91%_65%/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(142_76%_36%/0.1),transparent_50%)]" />
      
      <Card className="w-full max-w-md p-8 space-y-6 relative shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            እንኳን ደህና መጡ
          </h1>
          <p className="text-muted-foreground">
            በAI የሚሰራ የአማርኛ ድህረ ገፅ ገንቢ
          </p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">ግባ</TabsTrigger>
            <TabsTrigger value="signup">ይመዝገቡ</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ኢሜል</label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">የይለፍ ቃል</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    በመግባት ላይ...
                  </>
                ) : (
                  "ግባ"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ሙሉ ስም</label>
                <Input
                  type="text"
                  placeholder="ስምዎን ያስገቡ"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ኢሜል</label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">የይለፍ ቃል</label>
                <Input
                  type="password"
                  placeholder="ቢያንስ 6 ቁምፊዎች"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    በመመዝገብ ላይ...
                  </>
                ) : (
                  "መለያ ፍጠር"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
