import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import { CheckCircle2, ArrowRight, Home } from "lucide-react";

export default function CheckoutSuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const stripeSessionId = params.get("session_id");

  useEffect(() => {
    window.scrollTo(0, 0);
    // Phase 41 — mark offer accepted if we have a chat session linked
    const chatSessionId = localStorage.getItem("e360_session_id");
    const lastOffer = sessionStorage.getItem("e360_last_offer");
    if (chatSessionId && lastOffer) {
      fetch("/api/checkout/offer-accepted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: chatSessionId, offerSlug: lastOffer, source: "page" }),
      }).catch(() => {});
      sessionStorage.removeItem("e360_last_offer");
    }
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "hsl(220 50% 8%)" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle2
            className="w-20 h-20"
            style={{ color: "#22c55e" }}
          />
        </div>

        <div>
          <h1
            className="text-3xl font-heading font-bold text-white mb-3"
          >
            Payment Successful!
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            Thank you for your purchase. You'll receive a confirmation email
            shortly. We'll be in touch within <strong className="text-white">24 hours</strong> to
            get started.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 text-left space-y-3"
          style={{
            background: "rgba(244,166,42,0.08)",
            border: "1px solid rgba(244,166,42,0.2)",
          }}
        >
          <p className="text-[#F4A62A] font-semibold text-sm uppercase tracking-wide">
            What happens next
          </p>
          <ul className="space-y-2 text-white/70 text-sm">
            <li className="flex items-start gap-2">
              <span style={{ color: "#F4A62A" }}>1.</span> Check your email for
              a receipt and confirmation
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#F4A62A" }}>2.</span> Our team reviews
              your order and prepares your deliverable
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#F4A62A" }}>3.</span> We'll reach out
              within 24 hours with next steps
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/">
            <a
              data-testid="link-checkout-success-home"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all"
              style={{
                background: "#F4A62A",
                color: "#0d1a2e",
              }}
            >
              <Home className="w-4 h-4" /> Back to Home
            </a>
          </Link>
          <a
            href="/#book-session"
            data-testid="link-checkout-book-another"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Book a Session <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
