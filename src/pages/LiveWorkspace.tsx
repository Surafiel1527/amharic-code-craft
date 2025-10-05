import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { AIStatusMonitor } from '@/components/AIStatusMonitor';
import { IncrementalPreview } from '@/components/IncrementalPreview';
import { TypeScriptErrorPanel } from '@/components/TypeScriptErrorPanel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function LiveWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [projectId] = useState('live-' + Date.now());

  if (!user) {
    return <Navigate to="/auth" />;
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;

    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('stream-code-generation', {
        body: {
          projectId,
          prompt: prompt.trim(),
          userId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Code generation started!',
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Super Mega Mind Live Workspace</h1>
          <div className="text-sm text-muted-foreground">
            Real-time AI Development Platform
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {/* Left Panel - AI Status & Controls */}
          <div className="space-y-4 overflow-y-auto">
            <AIStatusMonitor projectId={projectId} />
            
            <Card className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">What do you want to build?</label>
                <Textarea
                  placeholder="E.g., Create a user dashboard with profile cards, a navigation header, and a statistics section..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  disabled={generating}
                />
              </div>
              <Button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Code'}
              </Button>
            </Card>

            <TypeScriptErrorPanel 
              projectId={projectId}
              onAutoFix={async (error) => {
                console.log('Auto-fixing:', error);
                // AI will handle the fix
              }}
            />
          </div>

          {/* Right Panel - Live Preview */}
          <div className="space-y-4 overflow-y-auto">
            <IncrementalPreview 
              projectId={projectId}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
