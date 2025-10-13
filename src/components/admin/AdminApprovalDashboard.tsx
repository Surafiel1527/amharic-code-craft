/**
 * Admin Approval Dashboard
 * Phase 4A: Control Center for AI Learning
 * 
 * Allows admins to review and approve/reject AI-generated improvements
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  GitCompare,
  TrendingUp,
  Brain,
  Sparkles,
  Filter
} from 'lucide-react';
import { ImprovementReviewCard } from './ImprovementReviewCard';
import { VersionComparisonDialog } from './VersionComparisonDialog';

interface ApprovalItem {
  id: string;
  item_type: string;
  item_id: string;
  status: string;
  priority: string;
  approval_score: number | null;
  metadata: any;
  created_at: string;
  submitted_by: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  auto_approved: boolean;
}

interface DashboardStats {
  pending: number;
  approved: number;
  rejected: number;
  highPriority: number;
}

export const AdminApprovalDashboard = () => {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    highPriority: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovalItems();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('approval-queue')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_approval_queue'
      }, () => {
        fetchApprovalItems();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchApprovalItems = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('admin_approval_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data || []);
      
      // Calculate stats
      const pending = data?.filter(i => i.status === 'pending').length || 0;
      const approved = data?.filter(i => i.status === 'approved').length || 0;
      const rejected = data?.filter(i => i.status === 'rejected').length || 0;
      const highPriority = data?.filter(i => i.priority === 'high' && i.status === 'pending').length || 0;
      
      setStats({ pending, approved, rejected, highPriority });
    } catch (error: any) {
      toast({
        title: "Error Loading Approvals",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemId: string, notes?: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-approval-handler', {
        body: {
          action: 'approve',
          itemId,
          notes
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Improvement Approved",
        description: "AI improvement has been applied to the system"
      });

      fetchApprovalItems();
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleReject = async (itemId: string, reason: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-approval-handler', {
        body: {
          action: 'reject',
          itemId,
          reason
        }
      });

      if (error) throw error;

      toast({
        title: "❌ Improvement Rejected",
        description: "AI improvement will not be applied"
      });

      fetchApprovalItems();
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openComparison = (item: ApprovalItem) => {
    setSelectedItem(item);
    setComparisonOpen(true);
  };

  const filteredItems = items.filter(item => {
    if (activeFilter === 'all') return true;
    return item.status === activeFilter;
  });

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'prompt_improvement': return <Brain className="h-4 w-4" />;
      case 'pattern_evolution': return <TrendingUp className="h-4 w-4" />;
      case 'ai_suggestion': return <Sparkles className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'prompt_improvement': return 'Prompt Improvement';
      case 'pattern_evolution': return 'Pattern Evolution';
      case 'ai_suggestion': return 'AI Suggestion';
      default: return type;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI Learning Approval Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve AI-generated improvements
          </p>
        </div>
        <Button onClick={fetchApprovalItems} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            {stats.highPriority > 0 && (
              <Badge variant="destructive" className="mt-2">
                {stats.highPriority} High Priority
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground mt-2">Applied to system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground mt-2">Not applied</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.approved + stats.rejected > 0 
                ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">Overall accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={activeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('all')}
        >
          All ({items.length})
        </Button>
        <Button
          variant={activeFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('pending')}
        >
          Pending ({stats.pending})
        </Button>
        <Button
          variant={activeFilter === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('approved')}
        >
          Approved ({stats.approved})
        </Button>
        <Button
          variant={activeFilter === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveFilter('rejected')}
        >
          Rejected ({stats.rejected})
        </Button>
      </div>

      {/* Approval Items List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Loading approval queue...</p>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {activeFilter === 'pending' 
                  ? 'No pending approvals - system is running smoothly!'
                  : `No ${activeFilter} items found`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map(item => (
            <ImprovementReviewCard
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              onViewComparison={openComparison}
              getIcon={getItemTypeIcon}
              getLabel={getItemTypeLabel}
            />
          ))
        )}
      </div>

      {/* Version Comparison Dialog */}
      {selectedItem && (
        <VersionComparisonDialog
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
          item={selectedItem}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};
