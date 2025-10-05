import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PreviewUpdate {
  component: string;
  code: string;
  timestamp: Date;
  status: 'pending' | 'rendering' | 'complete' | 'error';
}

interface IncrementalPreviewProps {
  projectId?: string;
  className?: string;
}

export function IncrementalPreview({ projectId, className }: IncrementalPreviewProps) {
  const [updates, setUpdates] = useState<PreviewUpdate[]>([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!projectId) return;

    // Subscribe to incremental code updates
    const channel = supabase
      .channel(`preview-${projectId}`)
      .on('broadcast', { event: 'code-update' }, ({ payload }) => {
        const update: PreviewUpdate = {
          ...payload,
          timestamp: new Date(payload.timestamp),
          status: 'rendering'
        };

        setUpdates(prev => [...prev, update]);
        
        // Incrementally build the HTML
        setPreviewHtml(prev => {
          const newHtml = prev + '\n' + payload.code;
          return newHtml;
        });

        // Mark as complete after render
        setTimeout(() => {
          setUpdates(prev => prev.map(u => 
            u.component === update.component ? { ...u, status: 'complete' } : u
          ));
        }, 500);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  useEffect(() => {
    // Update iframe content when HTML changes
    if (iframeRef.current && previewHtml) {
      const iframeDoc = iframeRef.current.contentDocument;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                * { transition: all 0.3s ease; }
                body { margin: 0; padding: 16px; }
              </style>
            </head>
            <body>
              ${previewHtml}
            </body>
          </html>
        `);
        iframeDoc.close();
      }
    }
  }, [previewHtml]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Component Status Bar */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          {updates.map((update, i) => (
            <Badge 
              key={i} 
              variant={update.status === 'complete' ? 'default' : 'outline'}
              className="gap-1"
            >
              {update.status === 'rendering' && <Loader2 className="h-3 w-3 animate-spin" />}
              {update.status === 'complete' && <CheckCircle2 className="h-3 w-3" />}
              {update.component}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Live Preview Frame */}
      <Card className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          title="Live Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </Card>
    </div>
  );
}
