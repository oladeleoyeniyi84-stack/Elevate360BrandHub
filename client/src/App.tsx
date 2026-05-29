import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import OpsCenter from "@/pages/OpsCenter";
import GrowthEngine from "@/pages/GrowthEngine";
import ExperimentLab from "@/pages/ExperimentLab";
import PersonalizationConsole from "@/pages/PersonalizationConsole";
import RevenueCommandCenter from "@/pages/RevenueCommandCenter";
import ExecutiveCenter from "@/pages/ExecutiveCenter";
import Authority from "@/pages/Authority";
import AuthorityAdmin from "@/pages/AuthorityAdmin";
import Marketplace from "@/pages/Marketplace";
import MarketplaceAdmin from "@/pages/MarketplaceAdmin";
import ContentFactory from "@/pages/ContentFactory";
import OrchestratorCenter from "@/pages/OrchestratorCenter";
import CommandGrid from "@/pages/CommandGrid";
import ExecutionMesh from "@/pages/ExecutionMesh";
import Links from "@/pages/Links";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import PressKit from "@/pages/PressKit";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import { CookieBanner } from "@/components/CookieBanner";
import { ScrollUtilities } from "@/components/ScrollUtilities";
import { NewsletterPopup } from "@/components/NewsletterPopup";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { LanguageProvider } from "@/contexts/LanguageContext";
import SEO from "@/components/SEO";
import ErrorBoundary from "@/components/ErrorBoundary";

function RouteTracker() {
  const [location] = useLocation();

  useEffect(() => {
    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: location }),
    }).catch(() => {});
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      <Route path="/links">
        <>
          <SEO
            title="Links | Elevate360Official"
            description="Explore all official Elevate360Official links — apps, books, music, art, and brand channels by Oladele Oyeniyi."
            path="/links"
          />
          <Links />
        </>
      </Route>

      <Route path="/dashboard">
        <>
          <SEO
            title="Dashboard | Elevate360Official"
            description="Internal dashboard and system overview for Elevate360Official."
            path="/dashboard"
          />
          <Dashboard />
        </>
      </Route>

      <Route path="/ops">
        <>
          <SEO
            title="Ops Center | Elevate360Official"
            description="Founder AI Operations Center for Elevate360Official."
            path="/ops"
          />
          <OpsCenter />
        </>
      </Route>

      <Route path="/growth">
        <>
          <SEO
            title="Growth Engine | Elevate360Official"
            description="Autonomous AI Growth Engine for Elevate360Official."
            path="/growth"
          />
          <GrowthEngine />
        </>
      </Route>

      <Route path="/experiments">
        <>
          <SEO
            title="Experiment Lab | Elevate360Official"
            description="AI Experiment Orchestrator for Elevate360Official."
            path="/experiments"
          />
          <ExperimentLab />
        </>
      </Route>

      <Route path="/personalization">
        <>
          <SEO
            title="Personalization Console | Elevate360Official"
            description="Autonomous Personalization Engine for Elevate360Official."
            path="/personalization"
          />
          <PersonalizationConsole />
        </>
      </Route>

      <Route path="/mesh">
        <>
          <SEO
            title="Execution Mesh | Elevate360Official"
            description="Distributed AI workforce for Elevate360Official."
            path="/mesh"
          />
          <ExecutionMesh />
        </>
      </Route>

      <Route path="/command-grid">
        <>
          <SEO
            title="Neural Command Grid | Elevate360Official"
            description="Real-time AI nervous system for Elevate360Official."
            path="/command-grid"
          />
          <CommandGrid />
        </>
      </Route>

      <Route path="/orchestrator">
        <>
          <SEO
            title="Orchestrator Center | Elevate360Official"
            description="AI Orchestrator Core for Elevate360Official."
            path="/orchestrator"
          />
          <OrchestratorCenter />
        </>
      </Route>

      <Route path="/revenue">
        <>
          <SEO
            title="Revenue Command Center | Elevate360Official"
            description="AI Revenue Command Center for Elevate360Official."
            path="/revenue"
          />
          <RevenueCommandCenter />
        </>
      </Route>

      <Route path="/executive">
        <>
          <SEO
            title="Executive Command Center | Elevate360Official"
            description="Unified executive cockpit for Elevate360Official."
            path="/executive"
          />
          <ExecutiveCenter />
        </>
      </Route>

      <Route path="/content-factory">
        <>
          <SEO
            title="AI Content Factory | Elevate360Official"
            description="Batch AI content generation cockpit for Elevate360Official."
            path="/content-factory"
          />
          <ContentFactory />
        </>
      </Route>

      <Route path="/founder">
        <>
          <SEO
            title="Founder Authority | Elevate360Official"
            description="Media features, milestones, credentials, and awards establishing the authority of Oladele Oyeniyi, founder of Elevate360Official."
            path="/founder"
            type="article"
          />
          <Authority />
        </>
      </Route>

      <Route path="/authority">
        <>
          <SEO
            title="Authority Manager | Elevate360Official"
            description="Manage founder authority items for Elevate360Official."
            path="/authority"
          />
          <AuthorityAdmin />
        </>
      </Route>

      <Route path="/marketplace">
        <>
          <SEO
            title="Marketplace | Elevate360Official"
            description="Premium digital products from Elevate360Official — tools, templates, and resources delivered instantly."
            path="/marketplace"
          />
          <Marketplace />
        </>
      </Route>

      <Route path="/marketplace-admin">
        <>
          <SEO
            title="Marketplace Manager | Elevate360Official"
            description="Manage marketplace digital products for Elevate360Official."
            path="/marketplace-admin"
          />
          <MarketplaceAdmin />
        </>
      </Route>

      <Route path="/blog">
        <>
          <SEO
            title="Blog | Elevate360Official"
            description="Read insights, inspiration, and updates from Elevate360Official on wellness, creativity, technology, relationships, and growth."
            path="/blog"
            type="article"
          />
          <Blog />
        </>
      </Route>

      <Route path="/blog/:slug" component={BlogPost} />

      <Route path="/press-kit">
        <>
          <SEO
            title="Press Kit | Elevate360Official"
            description="Access the official Elevate360Official press kit — brand overview, founder profile, product portfolio, and media assets."
            path="/press-kit"
          />
          <PressKit />
        </>
      </Route>

      <Route path="/checkout/success">
        <>
          <SEO
            title="Thank You | Elevate360Official"
            description="Thank you for engaging with Elevate360Official."
            path="/checkout/success"
          />
          <CheckoutSuccess />
        </>
      </Route>

      <Route path="/thank-you">
        <>
          <SEO
            title="Thank You | Elevate360Official"
            description="Thank you for engaging with Elevate360Official."
            path="/thank-you"
          />
          <CheckoutSuccess />
        </>
      </Route>

      <Route>
        <>
          <SEO
            title="Page Not Found | Elevate360Official"
            description="The page you are looking for could not be found. Explore Elevate360Official — apps, books, music, and art."
            path="/404"
          />
          <NotFound />
        </>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Helmet>
          <meta name="google-site-verification" content="DgUWn97PPSSeSgoFrwQwx4W-byMJ9QiyYCRqrxsS9vI" />
          <meta property="fb:app_id" content="122150153540988040" />
        </Helmet>
        <TooltipProvider>
          <Toaster />
          <ErrorBoundary scope="app">
            <Router />
          </ErrorBoundary>
          <RouteTracker />
          <ScrollUtilities />
          <NewsletterPopup />
          <AnnouncementBanner />
          <WhatsAppButton />
          <MobileBottomNav />
          <CookieBanner />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
