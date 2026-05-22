import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/layout/Layout";
import Home from "@/pages/home";
import HistoryPage from "@/pages/history";
import AnalysisPage from "@/pages/analysis";
import SimulatePage from "@/pages/simulate";
import ExtensionPage from "@/pages/extension";
import ApprovalsPage from "@/pages/approvals";
import WatchlistPage from "@/pages/watchlist";
import { CookiePage, ImpressumPage, PrivacyPage, TermsPage } from "@/pages/legal";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/approvals" component={ApprovalsPage} />
      <Route path="/watchlist" component={WatchlistPage} />
      <Route path="/simulate" component={SimulatePage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/analysis/:id" component={AnalysisPage} />
      <Route path="/extension" component={ExtensionPage} />
      <Route path="/impressum" component={ImpressumPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/cookies" component={CookiePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
