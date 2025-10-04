import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Check for password reset token and redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      // Check if this is a password reset callback
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery') {
        setShowResetPassword(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('✅ Auth page: User already logged in, redirecting to home');
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
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
        // Handle various signup errors with user-friendly messages
        if (error.message.includes("already registered") || 
            error.message.includes("User already registered") ||
            error.message.includes("Database error saving new user")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else if (error.message.includes("Invalid email")) {
          toast.error("Please enter a valid email address");
        } else if (error.message.includes("Password")) {
          toast.error("Password must be at least 6 characters");
        } else if (error.message.includes("Email rate limit exceeded")) {
          toast.error("Too many attempts. Please try again later.");
        } else {
          toast.error(`Sign up failed: ${error.message}`);
        }
        return;
      }

      // Auto-confirm is enabled, so user should be logged in immediately
      if (data.user && data.session) {
        toast.success("Account created successfully!");
        navigate("/");
      } else {
        toast.success("Account created. Please sign in.");
        setEmail("");
        setPassword("");
        setFullName("");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error?.message || "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter email and password");
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
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Signed in successfully!");
      navigate("/");
    } catch (error) {
      console.error("Signin error:", error);
      toast.error("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password reset link sent!", {
        description: "Check your email (and spam folder) for the reset link. It may take a few minutes to arrive.",
        duration: 8000,
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast.error("Failed to send reset email", {
        description: error?.message || "Please check your email address and try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully!");
      setShowResetPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      navigate("/");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(error?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(271_91%_65%/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(142_76%_36%/0.1),transparent_50%)]" />
      
      {/* Language Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>
      
      <Card className="w-full max-w-md p-8 space-y-6 relative shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t("hero.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("hero.subtitle")}
          </p>
        </div>

        {showResetPassword ? (
          <div className="space-y-4 mt-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Reset Password</h2>
              <p className="text-sm text-muted-foreground">Enter your new password</p>
            </div>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Updating password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowResetPassword(false);
                  window.history.replaceState({}, document.title, "/auth");
                }}
                disabled={isLoading}
              >
                Back to Sign In
              </Button>
            </form>
          </div>
        ) : showForgotPassword ? (
          <div className="space-y-4 mt-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Forgot Password</h2>
              <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
              <div className="bg-muted/50 border border-border rounded-lg p-3 mt-3">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Note:</strong> Check your spam/junk folder if you don't see the email within a few minutes.
                </p>
              </div>
            </div>
            
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowForgotPassword(false)}
                disabled={isLoading}
              >
                Back to Sign In
              </Button>
            </form>
          </div>
        ) : (
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
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
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm"
                    onClick={() => setShowForgotPassword(true)}
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
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
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
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
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </TabsContent>
          </Tabs>
        )}
      </Card>
    </div>
  );
};

export default Auth;
