// Phase 68A — gates children behind a premium feature entitlement.
// In-site use only (AI Concierge). External apps call the API directly.
import { ReactNode } from "react";
import { usePremiumStatus, useCustomer } from "@/hooks/useCustomer";
import { UpgradeBanner } from "./UpgradeBanner";

export function PremiumGate({
  feature,
  children,
  fallback,
}: {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isAuthenticated } = useCustomer();
  const { data, isLoading } = usePremiumStatus(isAuthenticated);

  if (!isAuthenticated || isLoading) return <>{fallback ?? null}</>;
  const owned = data?.features.includes(feature);
  if (owned) return <>{children}</>;
  return (
    <>
      {fallback ?? (
        <UpgradeBanner
          title="Premium feature"
          message="Upgrade your plan to unlock this feature."
          ctaText="See plans"
        />
      )}
    </>
  );
}
