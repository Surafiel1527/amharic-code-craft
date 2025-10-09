/**
 * AI System Dashboard - Phase 2
 * 
 * Central hub for all AI system features, analytics, and intelligence.
 * Beyond-enterprise level monitoring and control.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  LineChart, 
  Search, 
  Zap, 
  Shield, 
  TrendingUp,
  Activity,
  Database,
  CheckCircle2
} from "lucide-react";
import { AIAnalyticsDashboard } from "@/components/AIAnalyticsDashboard";
import { ConversationSearchPanel } from "@/components/ConversationSearchPanel";
import { PhaseCompletionDashboard } from "@/components/PhaseCompletionDashboard";
import { UniversalErrorLearningDashboard } from "@/components/UniversalErrorLearningDashboard";
import { MegaMindDashboard } from "@/components/MegaMindDashboard";
import { IntelligenceDashboard } from "@/components/IntelligenceDashboard";

export default function AISystemDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Brain className="h-10 w-10 text-primary" />
            AI System Control Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Beyond-enterprise intelligence platform with unified AI brain
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Activity className="h-4 w-4 mr-2" />
          System Active
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Universal AI</p>
                <p className="text-2xl font-bold">Unified</p>
              </div>
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Smart Routing</p>
                <p className="text-2xl font-bold">Active</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto-Learning</p>
                <p className="text-2xl font-bold">Enabled</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Security</p>
                <p className="text-2xl font-bold">Protected</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="mega-mind" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Mega Mind
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="error-learning" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Error Learning
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="phases" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Phases
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Universal AI Brain Architecture
              </CardTitle>
              <CardDescription>
                Single source of intelligence across the entire platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Smart Routing
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically routes requests to Error Teacher for known issues or Smart Orchestrator for complex tasks
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Universal Learning
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Shared knowledge across all interfaces - learns once, applies everywhere
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Auto-Fix Engine
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Instant solution application with confidence scoring and verification
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Progress Tracking
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time phase monitoring with detailed progress indicators
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Beyond-Enterprise Features</CardTitle>
              <CardDescription>
                Advanced capabilities that go beyond traditional enterprise platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <LineChart className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Advanced Analytics</h4>
                    <p className="text-sm text-muted-foreground">
                      Real-time performance metrics, cost optimization, and success rate tracking
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Search className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Semantic Search</h4>
                    <p className="text-sm text-muted-foreground">
                      Find relevant solutions across all conversations with intelligent ranking
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Production Hardening</h4>
                    <p className="text-sm text-muted-foreground">
                      Rate limit detection, payment error recovery, and graceful degradation
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mega-mind">
          <MegaMindDashboard />
        </TabsContent>

        <TabsContent value="analytics">
          <IntelligenceDashboard />
        </TabsContent>

        <TabsContent value="error-learning">
          <div className="text-center text-muted-foreground py-8">
            Error learning is now part of the Intelligence Dashboard (Analytics tab)
          </div>
        </TabsContent>

        <TabsContent value="search">
          <ConversationSearchPanel />
        </TabsContent>

        <TabsContent value="phases">
          <PhaseCompletionDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
