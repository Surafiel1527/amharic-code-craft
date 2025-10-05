import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import SharedProject from "./pages/SharedProject";
import Explore from "./pages/Explore";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import AISystemTest from "./pages/AISystemTest";
import AISystemDashboard from "./pages/AISystemDashboard";
import Builder from "./pages/Builder";
import Workspace from "./pages/Workspace";
import DatabaseManager from "./pages/DatabaseManager";
import Deploy from "./pages/Deploy";
import QualityHub from "./pages/QualityHub";
import LivePreview from "./pages/LivePreview";
import PackageManager from "./pages/PackageManager";
import TestingHub from "./pages/TestingHub";
import AITrainingDashboard from "./pages/AITrainingDashboard";
import Marketplace from "./pages/Marketplace";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BackgroundJobsIndicator } from "./components/BackgroundJobsIndicator";

const App = () => {
  return (
    <ErrorBoundary>
      <BackgroundJobsIndicator />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
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
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;