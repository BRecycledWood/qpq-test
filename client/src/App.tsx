import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/admin/Dashboard";
import QuizList from "@/pages/admin/QuizList";
import QuizBuilderPro from "@/pages/admin/QuizBuilderPro";
import QuizDashboard from "@/pages/admin/QuizDashboard";
import Analytics from "@/pages/admin/Analytics";
import Settings from "@/pages/admin/Settings";
import PacksAdmin from "@/pages/admin/PacksAdmin";
import QuizRunner from "@/pages/public/QuizRunner";
import PackRunner from "@/pages/public/PackRunner";
import Demo from "@/pages/public/Demo";
import Pricing from "@/pages/public/Pricing";
import Templates from "@/pages/public/Templates";
import TopNav from "@/components/layout/TopNav";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import Terms from "@/pages/legal/Terms";

/** Scroll to top on every route change */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      {/* Admin Routes */}
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/quizzes" component={QuizList} />
      <Route path="/admin/builder/new">
        <QuizBuilderPro isNew />
      </Route>
      <Route path="/admin/builder/:packId">
        <QuizBuilderPro />
      </Route>
      <Route path="/admin/quiz/:id/dashboard" component={QuizDashboard} />
      <Route path="/admin/analytics" component={Analytics} />
      <Route path="/admin/settings" component={Settings} />

      {/* Legacy — dev reference only */}
      <Route path="/admin/packs-legacy" component={PacksAdmin} />

      {/* Public Routes */}
      <Route path="/demo" component={Demo} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/templates" component={Templates} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={Terms} />
      <Route path="/w/:workspaceSlug/:packSlug" component={PackRunner} />
      <Route path="/quiz/:slug" component={QuizRunner} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ScrollToTop />
        <div className="min-h-screen bg-background text-foreground">
          <ScrollToTop />
          <TopNav />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
