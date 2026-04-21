import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { lazy, Suspense } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

const MarginSimulator = lazy(() => import("@/pages/MarginSimulator"));
const CostPerUser = lazy(() => import("@/pages/CostPerUser"));
const BudgetPlanner = lazy(() => import("@/pages/BudgetPlanner"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Contact = lazy(() => import("@/pages/Contact"));

const queryClient = new QueryClient();

function LoadingSpinner() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );
}

function Router() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Suspense fallback={<LoadingSpinner />}>
          <Switch>
            <Route path="/" component={MarginSimulator} />
            <Route path="/cost-per-user" component={CostPerUser} />
            <Route path="/budget-planner" component={BudgetPlanner} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/terms" component={Terms} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/contact" component={Contact} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
