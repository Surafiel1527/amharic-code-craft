import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BackgroundJobsIndicator } from "./components/BackgroundJobsIndicator";
import { useLanguage } from "./contexts/LanguageContext";

// Critical pages - loaded immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages for better performance
const Workspace = lazy(() => import("./pages/Workspace"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const SharedProject = lazy(() => import("./pages/SharedProject"));
const Explore = lazy(() => import("./pages/Explore"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const DatabaseManager = lazy(() => import("./pages/DatabaseManager"));
const Deploy = lazy(() => import("./pages/Deploy"));
const QualityHub = lazy(() => import("./pages/QualityHub"));
const PackageManager = lazy(() => import("./pages/PackageManager"));
const TestingHub = lazy(() => import("./pages/TestingHub"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProjectsDashboard = lazy(() => import("./pages/ProjectsDashboard"));
const SupabaseConnections = lazy(() => import("./pages/SupabaseConnections"));
const IntelligenceHub = lazy(() => import("./pages/IntelligenceHub"));
const PlatformAnalytics = lazy(() => import("./pages/PlatformAnalytics"));
const AdminInsights = lazy(() => import("./pages/AdminInsights"));
const AGIInsights = lazy(() => import("./pages/AGIInsights"));
const UXIntelligenceDashboard = lazy(() => import("./components/UXIntelligenceDashboard"));
const AGITest = lazy(() => import("./pages/AGITest"));
const AdminApprovalPage = lazy(() => import("./pages/AdminApprovalPage"));
const PromptEvolutionPage = lazy(() => import("./pages/PromptEvolutionPage"));
const UXPatternFeedbackPage = lazy(() => import("./pages/UXPatternFeedbackPage"));
const UnifiedAIDashboardPage = lazy(() => import("./pages/UnifiedAIDashboardPage"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  const { t } = useLanguage();
  
  return (
    <ErrorBoundary t={t}>
      <BackgroundJobsIndicator />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/workspace/:projectId" element={<Workspace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/profile/:userId" element={<UserProfile />} />
          <Route path="/shared/:shareToken" element={<SharedProject />} />
          <Route path="/database-manager" element={<DatabaseManager />} />
          <Route path="/deploy/:projectId" element={<Deploy />} />
          <Route path="/deploy" element={<Deploy />} />
          <Route path="/quality-hub" element={<QualityHub />} />
          <Route path="/package-manager" element={<PackageManager />} />
          <Route path="/testing" element={<TestingHub />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/projects" element={<ProjectsDashboard />} />
          <Route path="/supabase-connections" element={<SupabaseConnections />} />
          <Route path="/intelligence" element={<IntelligenceHub />} />
          <Route path="/platform-analytics" element={<PlatformAnalytics />} />
          <Route path="/admin/insights" element={<AdminInsights />} />
          <Route path="/admin/approvals" element={<AdminApprovalPage />} />
          <Route path="/admin/prompt-evolution" element={<PromptEvolutionPage />} />
          <Route path="/admin/ux-pattern-feedback" element={<UXPatternFeedbackPage />} />
          <Route path="/admin/ai-dashboard" element={<UnifiedAIDashboardPage />} />
          <Route path="/agi-insights" element={<AGIInsights />} />
          <Route path="/ux-intelligence" element={<UXIntelligenceDashboard />} />
          <Route path="/agi-test" element={<AGITest />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;