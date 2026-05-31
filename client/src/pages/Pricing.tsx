// Phase 68A — public pricing page.
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import { customerApi, type FeaturesResponse } from "@/api/customer";
import { useCustomer, usePremiumStatus } from "@/hooks/useCustomer";
import { PlanComparison } from "@/components/premium/PlanComparison";

const GOLD = "#F4A62A";

export default function Pricing() {
  const { isAuthenticated } = useCustomer();
  const { data: status } = usePremiumStatus(isAuthenticated);
  const { data, isLoading } = useQuery<FeaturesResponse>({
    queryKey: ["/api/premium/features"],
    queryFn: () => customerApi.features(),
  });

  return (
    <div className="min-h-screen bg-[hsl(220,50%,10%)] text-white">
      <SEO
        title="Pricing | Elevate360Official"
        description="Choose a plan to unlock more AI Concierge credits and premium features from Elevate360Official."
        path="/pricing"
      />
      <div className="max-w-5xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 text-sm hover:text-white" data-testid="link-home">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="text-center mt-8 mb-12">
          <h1 className="text-4xl font-bold" data-testid="text-pricing-title">Simple, transparent pricing</h1>
          <p className="text-white/60 mt-3 max-w-xl mx-auto">
            Start free with the AI Concierge. Upgrade any time for more credits and premium features.
          </p>
        </div>

        {isLoading || !data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : (
          <PlanComparison plans={data.plans} currentTier={status?.tier} isAuthenticated={isAuthenticated} />
        )}

        <p className="text-center text-white/40 text-xs mt-10">
          Payments are securely processed by Stripe. Manage or cancel any time from your account.
        </p>
      </div>
    </div>
  );
}
