/**
 * Improvement Review Card
 * Individual card for reviewing an AI improvement
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  XCircle, 
  GitCompare, 
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ImprovementReviewCardProps {
  item: any;
  onApprove: (itemId: string, notes?: string) => Promise<void>;
  onReject: (itemId: string, reason: string) => Promise<void>;
  onViewComparison: (item: any) => void;
  getIcon: (type: string) => React.ReactNode;
  getLabel: (type: string) => string;
}

export const ImprovementReviewCard = ({
  item,
  onApprove,
  onReject,
  onViewComparison,
  getIcon,
  getLabel
}: ImprovementReviewCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    await onApprove(item.id, notes);
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      return;
    }
    setProcessing(true);
    await onReject(item.id, rejectReason);
    setProcessing(false);
    setShowRejectInput(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className={item.status === 'pending' ? 'border-primary/50' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">{getIcon(item.item_type)}</div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {getLabel(item.item_type)}
                <Badge variant={getPriorityColor(item.priority || 'normal')}>
                  {item.priority || 'normal'}
                </Badge>
                {item.auto_approved && (
                  <Badge variant="outline">
                    Auto-Approved
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                {item.approval_score && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Confidence: {item.approval_score}%
                  </span>
                )}
                <span className={`font-medium capitalize ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Improvement Details */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Improvement Details:</h4>
            <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          </div>

          {/* Reviewed Info */}
          {item.status !== 'pending' && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Review Information:</h4>
              <p className="text-sm">
                <strong>Reviewed:</strong> {new Date(item.reviewed_at).toLocaleString()}
              </p>
              {item.reviewer_notes && (
                <p className="text-sm">
                  <strong>Notes:</strong> {item.reviewer_notes}
                </p>
              )}
            </div>
          )}

          {/* Actions (only for pending items) */}
          {item.status === 'pending' && (
            <div className="space-y-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onViewComparison(item)}
                className="w-full"
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Compare Versions
              </Button>

              <Textarea
                placeholder="Add approval notes (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px]"
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve & Apply
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectInput(!showRejectInput)}
                  disabled={processing}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>

              {showRejectInput && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Reason for rejection (required)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || processing}
                    className="w-full"
                  >
                    Confirm Rejection
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
