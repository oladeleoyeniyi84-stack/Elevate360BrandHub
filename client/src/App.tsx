import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/links" component={Links} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/press-kit" component={PressKit} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
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
