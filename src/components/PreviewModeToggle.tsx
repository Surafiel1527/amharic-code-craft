import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PreviewModeToggleProps {
  isPreviewMode: boolean;
  onToggle: () => void;
  pendingCount: number;
}

export function PreviewModeToggle({ isPreviewMode, onToggle, pendingCount }: PreviewModeToggleProps) {
  return (
    <Button
      variant={isPreviewMode ? "default" : "outline"}
      size="sm"
      onClick={onToggle}
      className="gap-2 relative"
    >
      {isPreviewMode ? (
        <>
          <Eye className="h-4 w-4" />
          Preview Mode: ON
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4" />
          Preview Mode: OFF
        </>
      )}
      {pendingCount > 0 && !isPreviewMode && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {pendingCount}
        </Badge>
      )}
    </Button>
  );
}
