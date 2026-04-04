import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import SEO from "@/components/SEO";
import {
  CheckCircle2,
  Home,
  Mail,
  ArrowRight,
  ExternalLink,
  CreditCard,
  PackageCheck,
  CalendarCheck2,
  MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "weareelevate360@gmail.com";

function formatAmount(amount?: string | null) {
  if (!amount) return null;
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numeric / 100);
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSourceMeta(source: string) {
  switch (source) {
    case "purchase":
      return {
        label: "purchase",
        heading: "Payment Successful",
        description: "Your purchase was completed successfully. Thank you for choosing Elevate360.",
        Icon: CreditCard,
      };
    case "booking":
      return {
        label: "booking",
        heading: "Booking Confirmed",
        description: "Your booking was received successfully. We look forward to serving you.",
        Icon: CalendarCheck2,
      };
    case "order":
      return {
        label: "order",
        heading: "Order Confirmed",
        description: "Your order has been received successfully and is now being processed.",
        Icon: PackageCheck,
      };
    case "message":
      return {
        label: "message",
        heading: "Message Received",
        description: "Your message was submitted successfully. We will follow up with you shortly.",
        Icon: MessageSquareText,
      };
    default:
      return {
        label: "transaction",
        heading: "Thank You",
        description: "Your transaction was successful. Thank you for choosing Elevate360.",
        Icon: CheckCircle2,
      };
  }
}

type OrderStatusResponse = {
  source?: "purchase" | "booking" | "order" | "message";
  paymentStatus?: "paid" | "pending" | "failed";
  fulfillmentStatus?: "queued" | "processing" | "delivered" | "scheduled";
  amount?: number | null;
  offerSlug?: string | null;
};

export default function CheckoutSuccess() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const source = params.get("source") || "purchase";
  const plan = params.get("plan");
  const amount = params.get("amount");
  const sessionId = params.get("session_id");
  const reference = params.get("ref") || sessionId;

  const formattedAmount = formatAmount(amount);
  const meta = getSourceMeta(source);
  const Icon = meta.Icon;

  const orderStatusQuery = useQuery<OrderStatusResponse>({
    queryKey: ["order-status", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/status?session_id=${encodeURIComponent(sessionId || "")}`);
      if (!res.ok) throw new Error("Failed to fetch order status");
      return res.json();
    },
    enabled: !!sessionId,
    retry: 1,
  });

  // Phase 41 — mark offer accepted in AI Concierge pipeline
  useEffect(() => {
    window.scrollTo(0, 0);
    const chatSessionId = sessionStorage.getItem("e360_chat_session");
    const lastOffer = sessionStorage.getItem("e360_last_offer");
    if (chatSessionId && lastOffer) {
      fetch("/api/checkout/offer-accepted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: chatSessionId, offerSlug: lastOffer, source: "page", sourcePage: window.location.pathname }),
      }).catch(() => {});
      sessionStorage.removeItem("e360_last_offer");
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SEO
        title="Thank You | Elevate360Official"
        description="Thank you for connecting with Elevate360Official."
        path="/thank-you"
      />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,166,42,0.18),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.18),rgba(2,6,23,0.96))]" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md sm:p-12">

            {/* Icon + heading */}
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15">
                <Icon className="h-10 w-10 text-emerald-400" />
              </div>
              <p className="mb-3 text-sm uppercase tracking-[0.3em] text-[#F4A62A]">
                Elevate360 Official
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                {meta.heading}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                {meta.description}
              </p>
            </div>

            {/* Confirmation details */}
            <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
                Confirmation Details
              </h2>
              <div className="space-y-3 text-sm sm:text-base">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Type</span>
                  <span className="font-medium text-white">{titleCase(meta.label)}</span>
                </div>
                {plan && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Plan / Product</span>
                    <span className="font-medium text-white">{plan}</span>
                  </div>
                )}
                {formattedAmount && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Amount</span>
                    <span className="font-medium text-white">{formattedAmount}</span>
                  </div>
                )}
                {reference && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">{sessionId ? "Session ID" : "Reference"}</span>
                    <span className="max-w-[65%] break-all text-right font-medium text-white">
                      {reference}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Live order status */}
            {orderStatusQuery.data && (
              <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5" data-testid="panel-order-status">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">Live Status</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Payment</p>
                    <p className="mt-1 text-white font-medium" data-testid="status-payment">{titleCase(orderStatusQuery.data.paymentStatus || "pending")}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Fulfillment</p>
                    <p className="mt-1 text-white font-medium" data-testid="status-fulfillment">{titleCase(orderStatusQuery.data.fulfillmentStatus || "queued")}</p>
                  </div>
                </div>
              </div>
            )}

            {/* What happens next */}
            <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#F4A62A]/20 bg-[#F4A62A]/5 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#F4A62A]">
                What Happens Next
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Your submission has been recorded successfully.</li>
                <li>• A confirmation email or follow-up message may be sent shortly.</li>
                <li>• Our team will review and process the next step within 24 hours.</li>
              </ul>
            </div>

            {/* CTA buttons */}
            <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              <Link href="/">
                <Button
                  data-testid="link-checkout-success-home"
                  className="w-full bg-[#F4A62A] text-[#0d1a2e] hover:bg-amber-400 font-semibold"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="w-full">
                <Button
                  variant="outline"
                  data-testid="link-checkout-success-support"
                  className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
              </a>
            </div>

            {/* Footer */}
            <div className="mx-auto mt-8 max-w-2xl border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-slate-400">
                Need help with your payment, order, booking, or digital delivery?
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-3 inline-flex items-center text-[#F4A62A] transition hover:text-amber-300"
              >
                {SUPPORT_EMAIL}
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
              <div className="mt-6">
                <Link
                  href="/"
                  data-testid="link-checkout-success-browse"
                  className="inline-flex items-center text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Continue browsing Elevate360
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
