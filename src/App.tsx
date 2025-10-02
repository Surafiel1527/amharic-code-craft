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
import { ErrorBoundary } from "./components/ErrorBoundary";

const App = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/profile/:userId" element={<UserProfile />} />
        <Route path="/shared/:shareToken" element={<SharedProject />} />
        <Route path="/ai-test" element={<AISystemTest />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;