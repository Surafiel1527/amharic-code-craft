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
      <header className="border-b p-2 bg-background">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Super Mega Mind</h1>
          <div className="text-xs text-muted-foreground">
            Live AI Platform
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-2 p-2">
          {/* Left Panel - AI Status & Controls */}
          <div className="space-y-2 overflow-y-auto">
            <AIStatusMonitor projectId={projectId} />
            
            <Card className="p-2 space-y-2">
              <Textarea
                placeholder="What do you want to build?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                disabled={generating}
                className="text-sm"
              />
              <Button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                size="sm"
                className="w-full"
              >
                <Send className="h-3 w-3 mr-1" />
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            </Card>

            <TypeScriptErrorPanel 
              projectId={projectId}
              onAutoFix={async (error) => {
                console.log('Auto-fixing:', error);
              }}
            />
          </div>

          {/* Right Panel - Live Preview */}
          <div className="overflow-y-auto">
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
