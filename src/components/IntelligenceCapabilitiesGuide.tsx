import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertTriangle, Brain, Lock, Eye } from "lucide-react";

/**
 * Intelligence Capabilities Guide
 * Documents all auto-intelligent features of the Mega Mind platform
 */

export function IntelligenceCapabilitiesGuide() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">🧠 Mega Mind Intelligence System</h1>
        <p className="text-muted-foreground text-lg">
          Your platform now automatically handles security, authentication, and best practices
        </p>
      </div>

      {/* Pattern Recognition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Pattern Recognition
            <Badge variant="default">Active</Badge>
          </CardTitle>
          <CardDescription>
            Automatically detects what you're building and applies the right patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">✅ Auto-Detects:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• CRUD operations → Adds authentication</li>
                <li>• Delete actions → Adds confirmation dialogs</li>
                <li>• New tables → Creates RLS policies</li>
                <li>• User data → Protects with auth checks</li>
                <li>• PII fields → Applies extra security</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">🎯 Keywords Trigger Auto-Features:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• "todo", "notes" → Auth + RLS</li>
                <li>• "profile", "settings" → Profile page + hooks</li>
                <li>• "delete", "remove" → Confirmation dialogs</li>
                <li>• "admin", "manage" → Role-based access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Intelligence Layer
            <Badge variant="default">Active</Badge>
          </CardTitle>
          <CardDescription>
            Every table, every route, every query gets security analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg space-y-2">
              <Lock className="h-8 w-8 text-green-500" />
              <h4 className="font-semibold">RLS Auto-Apply</h4>
              <p className="text-sm text-muted-foreground">
                New tables get RLS enabled + user-based policies automatically
              </p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <Eye className="h-8 w-8 text-blue-500" />
              <h4 className="font-semibold">PII Detection</h4>
              <p className="text-sm text-muted-foreground">
                Scans for email, phone, address fields and restricts public access
              </p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <h4 className="font-semibold">Risk Warnings</h4>
              <p className="text-sm text-muted-foreground">
                Alerts you about missing auth checks or exposed data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Engine */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Confirmation Rules Engine
            <Badge variant="default">Active</Badge>
          </CardTitle>
          <CardDescription>
            Major changes pause for your approval with previews
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">🛑 Always Pauses For:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Schema migrations (new tables, columns)</li>
              <li>• RLS policy changes</li>
              <li>• Authentication system changes</li>
              <li>• Deleting/dropping tables or columns</li>
              <li>• Changes affecting 3+ tables or 5+ components</li>
            </ul>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>What you see:</strong> Preview of changes, affected resources, severity level, 
              and easy "Approve" or "Reject" options before anything executes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Context Memory */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Context Memory System</CardTitle>
          <CardDescription>
            Platform remembers your project state and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Remembers:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Auth is enabled</li>
                <li>✓ Profiles table exists</li>
                <li>✓ Protected routes used</li>
                <li>✓ Your preferred patterns</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Auto-Applies Next Time:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>→ Reuses auth patterns</li>
                <li>→ Links to existing profile table</li>
                <li>→ Applies same RLS style</li>
                <li>→ Suggests similar components</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Components */}
      <Card>
        <CardHeader>
          <CardTitle>🧩 Auto-Generated Components</CardTitle>
          <CardDescription>
            These are created automatically when needed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 border rounded">
              <code className="text-sm font-mono">&lt;ProtectedRoute&gt;</code>
              <p className="text-sm text-muted-foreground mt-1">Wraps auth-required pages, auto-redirects to /auth</p>
            </div>
            <div className="p-3 border rounded">
              <code className="text-sm font-mono">&lt;ConfirmDialog&gt;</code>
              <p className="text-sm text-muted-foreground mt-1">Reusable confirmation for delete/edit actions</p>
            </div>
            <div className="p-3 border rounded">
              <code className="text-sm font-mono">useProfile(userId)</code>
              <p className="text-sm text-muted-foreground mt-1">Hook for profile CRUD with loading states</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Flow */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle>💡 Example: How It All Works Together</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm"><strong>You say:</strong> "Add a todo list feature"</p>
            <div className="ml-4 space-y-1 text-sm text-muted-foreground">
              <p>1. 🧠 Pattern Recognition detects "todo" → needs auth + RLS</p>
              <p>2. 🔒 Security Intelligence checks auth exists → creates if missing</p>
              <p>3. ⏸️ Confirmation Engine shows migration preview → you approve</p>
              <p>4. ✅ Creates `todos` table with RLS policies automatically</p>
              <p>5. 🧩 Generates TodoList component with ProtectedRoute wrapper</p>
              <p>6. 🗑️ Delete buttons get ConfirmDialog automatically</p>
              <p>7. 📝 Context Memory saves that project has auth enabled</p>
            </div>
            <p className="text-sm font-semibold text-primary mt-4">
              Result: Secure, production-ready feature in seconds 🚀
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
