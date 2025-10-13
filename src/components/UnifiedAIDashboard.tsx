/**
 * Phase 4D: Unified AI Dashboard
 * Central hub for all autonomous learning systems
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Activity,
  BarChart3,
  Shield
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SystemMetrics {
  admin_approvals: { pending: number; approved: number; rejected: number };
  prompt_evolution: { total: number; avg_success_rate: number; improvements: number };
  ux_patterns: { active: number; degraded: number; interventions: number };
  healing_cycles: { total: number; success_rate: number; auto_fixed: number };
}

export function UnifiedAIDashboard() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadMetrics();
    
    // Real-time subscriptions
    const channel = supabase
      .channel('unified-ai-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_approval_queue' }, loadMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_prompts' }, loadMetrics)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learned_patterns' }, loadMetrics)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMetrics = async () => {
    try {
      // Load all system metrics in parallel
      const [approvalsData, promptsData, patternsData, healingData] = await Promise.all([
        supabase.from('admin_approval_queue').select('status'),
        supabase.from('ai_prompts').select('success_rate, times_used'),
        supabase.from('learned_patterns').select('confidence, pattern_data'),
        supabase.from('auto_fixes').select('status')
      ]);

      const approvals = approvalsData.data || [];
      const prompts = promptsData.data || [];
      const patterns = patternsData.data || [];
      const healing = healingData.data || [];

      setMetrics({
        admin_approvals: {
          pending: approvals.filter(a => a.status === 'pending').length,
          approved: approvals.filter(a => a.status === 'approved').length,
          rejected: approvals.filter(a => a.status === 'rejected').length
        },
        prompt_evolution: {
          total: prompts.length,
          avg_success_rate: prompts.length > 0 
            ? prompts.reduce((sum, p) => sum + (p.success_rate || 0), 0) / prompts.length 
            : 0,
          improvements: prompts.filter(p => p.times_used > 0).length
        },
        ux_patterns: {
          active: patterns.filter(p => p.confidence && p.confidence > 0.5).length,
          degraded: patterns.filter(p => p.confidence && p.confidence < 0.3).length,
          interventions: 0 // Will be implemented when pattern_interventions table exists
        },
        healing_cycles: {
          total: healing.length,
          success_rate: healing.length > 0
            ? (healing.filter(h => h.status === 'applied').length / healing.length) * 100
            : 0,
          auto_fixed: healing.filter(h => h.status === 'applied').length
        }
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast({
        title: 'Error Loading Metrics',
        description: 'Failed to load system metrics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const systemHealth = calculateSystemHealth(metrics);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            Autonomous Learning System
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring and control of all AI learning systems
          </p>
        </div>
        <Badge variant={systemHealth > 80 ? 'default' : systemHealth > 60 ? 'secondary' : 'destructive'} className="text-lg px-4 py-2">
          System Health: {systemHealth.toFixed(0)}%
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          title="Pending Approvals"
          value={metrics.admin_approvals.pending}
          description="Items awaiting review"
          trend={metrics.admin_approvals.pending > 5 ? 'warning' : 'normal'}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Prompt Success Rate"
          value={`${metrics.prompt_evolution.avg_success_rate.toFixed(1)}%`}
          description="Average across all prompts"
          trend={metrics.prompt_evolution.avg_success_rate > 70 ? 'success' : 'normal'}
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          title="Active Patterns"
          value={metrics.ux_patterns.active}
          description="High-confidence patterns"
          trend="success"
        />
        <StatCard
          icon={<Zap className="h-5 w-5" />}
          title="Auto-Fixes Applied"
          value={metrics.healing_cycles.auto_fixed}
          description="Autonomous healing events"
          trend="success"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="healing">Healing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SystemOverview metrics={metrics} />
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Admin Approval System</CardTitle>
              <CardDescription>Review and approve AI-generated improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <MetricBox label="Pending" value={metrics.admin_approvals.pending} color="yellow" />
                  <MetricBox label="Approved" value={metrics.admin_approvals.approved} color="green" />
                  <MetricBox label="Rejected" value={metrics.admin_approvals.rejected} color="red" />
                </div>
                <Button onClick={() => window.location.href = '/admin/approvals'} className="w-full">
                  Open Approval Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Evolution Engine</CardTitle>
              <CardDescription>AI-driven prompt optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <MetricBox label="Total Prompts" value={metrics.prompt_evolution.total} color="blue" />
                  <MetricBox label="Improvements" value={metrics.prompt_evolution.improvements} color="green" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average Success Rate</span>
                    <span className="font-medium">{metrics.prompt_evolution.avg_success_rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.prompt_evolution.avg_success_rate} />
                </div>
                <Button onClick={() => window.location.href = '/admin/prompt-evolution'} className="w-full">
                  Open Prompt Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>UX-Pattern Integration</CardTitle>
              <CardDescription>Pattern confidence based on user experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <MetricBox label="Active" value={metrics.ux_patterns.active} color="green" />
                  <MetricBox label="Degraded" value={metrics.ux_patterns.degraded} color="yellow" />
                  <MetricBox label="Interventions" value={metrics.ux_patterns.interventions} color="red" />
                </div>
                <Button onClick={() => window.location.href = '/admin/ux-pattern-feedback'} className="w-full">
                  Open UX Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="healing">
          <Card>
            <CardHeader>
              <CardTitle>Autonomous Healing</CardTitle>
              <CardDescription>Self-correcting error detection and fixes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <MetricBox label="Total Cycles" value={metrics.healing_cycles.total} color="blue" />
                  <MetricBox label="Auto-Fixed" value={metrics.healing_cycles.auto_fixed} color="green" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium">{metrics.healing_cycles.success_rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.healing_cycles.success_rate} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SystemOverview({ metrics }: { metrics: SystemMetrics }) {
  const systemStatus = [
    {
      system: 'Admin Approvals',
      icon: <Shield className="h-5 w-5" />,
      status: metrics.admin_approvals.pending < 10 ? 'healthy' : 'warning',
      message: `${metrics.admin_approvals.pending} items pending review`
    },
    {
      system: 'Prompt Evolution',
      icon: <Brain className="h-5 w-5" />,
      status: metrics.prompt_evolution.avg_success_rate > 70 ? 'healthy' : 'needs-attention',
      message: `${metrics.prompt_evolution.avg_success_rate.toFixed(1)}% average success rate`
    },
    {
      system: 'Pattern Learning',
      icon: <Target className="h-5 w-5" />,
      status: metrics.ux_patterns.degraded < 5 ? 'healthy' : 'warning',
      message: `${metrics.ux_patterns.active} active patterns, ${metrics.ux_patterns.degraded} degraded`
    },
    {
      system: 'Healing Engine',
      icon: <Activity className="h-5 w-5" />,
      status: metrics.healing_cycles.success_rate > 80 ? 'healthy' : 'needs-attention',
      message: `${metrics.healing_cycles.success_rate.toFixed(0)}% healing success rate`
    }
  ];

  return (
    <div className="grid gap-4">
      {systemStatus.map((item) => (
        <Card key={item.system}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${getStatusColor(item.status)}`}>
                {item.icon}
              </div>
              <div>
                <h3 className="font-semibold">{item.system}</h3>
                <p className="text-sm text-muted-foreground">{item.message}</p>
              </div>
            </div>
            <Badge variant={item.status === 'healthy' ? 'default' : item.status === 'warning' ? 'secondary' : 'destructive'}>
              {item.status === 'healthy' ? 'Healthy' : item.status === 'warning' ? 'Warning' : 'Needs Attention'}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatCard({ icon, title, value, description, trend }: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  trend: 'success' | 'warning' | 'normal';
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${
            trend === 'success' ? 'bg-green-500/10 text-green-500' :
            trend === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
            'bg-blue-500/10 text-blue-500'
          }`}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold">{value}</h3>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value, color }: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClass = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    red: 'bg-red-500/10 text-red-500'
  }[color];

  return (
    <div className={`p-4 rounded-lg ${colorClass}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

function calculateSystemHealth(metrics: SystemMetrics): number {
  const approvalHealth = Math.max(0, 100 - (metrics.admin_approvals.pending * 2));
  const promptHealth = metrics.prompt_evolution.avg_success_rate;
  const patternHealth = metrics.ux_patterns.active > 0 
    ? (metrics.ux_patterns.active / (metrics.ux_patterns.active + metrics.ux_patterns.degraded)) * 100
    : 50;
  const healingHealth = metrics.healing_cycles.success_rate;

  return (approvalHealth + promptHealth + patternHealth + healingHealth) / 4;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500/10 text-green-500';
    case 'warning':
      return 'bg-yellow-500/10 text-yellow-500';
    case 'needs-attention':
      return 'bg-red-500/10 text-red-500';
    default:
      return 'bg-blue-500/10 text-blue-500';
  }
}
