import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BackgroundJobsIndicator } from "./components/BackgroundJobsIndicator";

// Critical pages - loaded immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages for better performance
const Builder = lazy(() => import("./pages/Builder"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Settings = lazy(() => import("./pages/Settings"));
const TestDashboard = lazy(() => import("./pages/TestDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const SharedProject = lazy(() => import("./pages/SharedProject"));
const Explore = lazy(() => import("./pages/Explore"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AISystemTest = lazy(() => import("./pages/AISystemTest"));
const AISystemDashboard = lazy(() => import("./pages/AISystemDashboard"));
const DatabaseManager = lazy(() => import("./pages/DatabaseManager"));
const Deploy = lazy(() => import("./pages/Deploy"));
const QualityHub = lazy(() => import("./pages/QualityHub"));
const LivePreview = lazy(() => import("./pages/LivePreview"));
const PackageManager = lazy(() => import("./pages/PackageManager"));
const TestingHub = lazy(() => import("./pages/TestingHub"));
const AITrainingDashboard = lazy(() => import("./pages/AITrainingDashboard"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const TaskManagerOrchestration = lazy(() => import("./pages/TaskManagerOrchestration"));
const SelfHealingHub = lazy(() => import("./pages/SelfHealingHub"));
const ActivityDemo = lazy(() => import("./pages/ActivityDemo"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  return (
    <ErrorBoundary>
      <BackgroundJobsIndicator />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/test-dashboard" element={<TestDashboard />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/workspace/:projectId" element={<Workspace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/profile/:userId" element={<UserProfile />} />
          <Route path="/shared/:shareToken" element={<SharedProject />} />
          <Route path="/ai-test" element={<AISystemTest />} />
          <Route path="/ai-system" element={<AISystemDashboard />} />
          <Route path="/database-manager" element={<DatabaseManager />} />
          <Route path="/deploy/:projectId" element={<Deploy />} />
          <Route path="/quality-hub" element={<QualityHub />} />
          <Route path="/live-preview" element={<LivePreview />} />
          <Route path="/package-manager" element={<PackageManager />} />
          <Route path="/testing" element={<TestingHub />} />
          <Route path="/ai-training" element={<AITrainingDashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/task-manager-orchestration" element={<TaskManagerOrchestration />} />
          <Route path="/self-healing" element={<SelfHealingHub />} />
          <Route path="/activity-demo" element={<ActivityDemo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;