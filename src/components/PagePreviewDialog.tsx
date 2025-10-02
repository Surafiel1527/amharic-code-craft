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
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Preview: {pageTitle}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 w-full h-[calc(90vh-80px)]">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={`Preview of ${pageTitle}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
