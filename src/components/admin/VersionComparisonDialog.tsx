/**
 * Version Comparison Dialog
 * Shows before/after comparison of AI improvements
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';

interface VersionComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  onApprove: (itemId: string, notes?: string) => Promise<void>;
  onReject: (itemId: string, reason: string) => Promise<void>;
}

export const VersionComparisonDialog = ({
  open,
  onOpenChange,
  item,
  onApprove,
  onReject
}: VersionComparisonDialogProps) => {
  const [processing, setProcessing] = useState(false);

  const beforeVersion = item.metadata?.before || 'No previous version';
  const afterVersion = item.metadata?.after || 'No new version';
  const changes = item.metadata?.changes || [];
  const impact = item.metadata?.impact || {};

  const handleQuickApprove = async () => {
    setProcessing(true);
    await onApprove(item.id, 'Approved after comparison review');
    setProcessing(false);
    onOpenChange(false);
  };

  const handleQuickReject = async () => {
    setProcessing(true);
    await onReject(item.id, 'Rejected after comparison review');
    setProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Version Comparison
            <Badge>{item.item_type}</Badge>
          </DialogTitle>
          <DialogDescription>
            Compare the current version with the proposed improvement
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="side-by-side" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
          </TabsList>

          {/* Side by Side Comparison */}
          <TabsContent value="side-by-side" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Current Version</h3>
                  <Badge variant="outline">Before</Badge>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                    {typeof beforeVersion === 'string' 
                      ? beforeVersion 
                      : JSON.stringify(beforeVersion, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Proposed Version</h3>
                  <Badge variant="default">After</Badge>
                </div>
                <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
                  <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                    {typeof afterVersion === 'string' 
                      ? afterVersion 
                      : JSON.stringify(afterVersion, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Changes List */}
          <TabsContent value="changes" className="space-y-4">
            {changes.length > 0 ? (
              <div className="space-y-2">
                {changes.map((change: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <ArrowRight className="h-4 w-4 mt-1 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{change.type || 'Change'}</p>
                      <p className="text-sm text-muted-foreground">{change.description}</p>
                      {change.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {change.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No detailed changes available</p>
              </div>
            )}
          </TabsContent>

          {/* Impact Analysis */}
          <TabsContent value="impact" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-400">
                  Positive Impact
                </h4>
                <ul className="space-y-1 text-sm">
                  {impact.positive?.length > 0 ? (
                    impact.positive.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No positive impacts listed</li>
                  )}
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 text-yellow-700 dark:text-yellow-400">
                  Potential Risks
                </h4>
                <ul className="space-y-1 text-sm">
                  {impact.risks?.length > 0 ? (
                    impact.risks.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 mt-0.5 text-yellow-600" />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No risks identified</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Metrics */}
            {impact.metrics && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-sm mb-3">Expected Metrics</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {Object.entries(impact.metrics).map(([key, value]: [string, any]) => (
                    <div key={key}>
                      <p className="text-2xl font-bold text-primary">{value}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        {item.status === 'pending' && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleQuickApprove}
              disabled={processing}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve & Apply
            </Button>
            <Button
              variant="destructive"
              onClick={handleQuickReject}
              disabled={processing}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
