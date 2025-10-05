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
import Builder from "./pages/Builder";
import Workspace from "./pages/Workspace";
import DatabaseManager from "./pages/DatabaseManager";
import Deploy from "./pages/Deploy";
import { ErrorBoundary } from "./components/ErrorBoundary";

const App = () => {
  return (
    <ErrorBoundary>
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
        <Route path="/database-manager" element={<DatabaseManager />} />
        <Route path="/deploy/:projectId" element={<Deploy />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;