import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, X } from "lucide-react";

interface PagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagePath: string;
  pageTitle: string;
}

export function PagePreviewDialog({ open, onOpenChange, pagePath, pageTitle }: PagePreviewDialogProps) {
  const previewUrl = `${window.location.origin}${pagePath}?preview=true`;

  const handleOpenInNewTab = () => {
    window.open(previewUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] sm:h-[85vh] p-0 gap-0">
        <DialogHeader className="p-3 sm:p-4 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base truncate">
              Preview: {pageTitle}
            </DialogTitle>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              >
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Open in New Tab</span>
                <span className="sm:hidden">Open</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 sm:h-9 sm:w-9 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 w-full overflow-hidden">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={`Preview of ${pageTitle}`}
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
            loading="eager"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
