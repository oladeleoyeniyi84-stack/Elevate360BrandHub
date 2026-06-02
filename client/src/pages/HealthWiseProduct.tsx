// Phase 68B.2 — Healthwisesupport product marketing page (in-site, no API/dashboard).
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, HeartPulse, Activity, Stethoscope, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import { useCustomer } from "@/hooks/useCustomer";
import appHealthwise from "@/assets/images/app-healthwise.png";

const GOLD = "#F4A62A";
const APP_URL = "https://health.elevate360official.com";

const FEATURES = [
  { icon: HeartPulse, title: "Wellness tracking", body: "Monitor your health journey with simple, daily check-ins." },
  { icon: Activity, title: "Healthy habits", body: "Build routines that keep you consistent and motivated." },
  { icon: Stethoscope, title: "Support access", body: "Connect with wellness resources and guidance when you need it." },
];

export default function HealthWiseProduct() {
  const { isAuthenticated } = useCustomer();

  return (
    <div className="min-h-screen bg-[hsl(220,50%,10%)] text-white">
      <SEO
        title="Healthwisesupport — Wellness App | Elevate360Official"
        description="Healthwisesupport is your wellness companion app — track your health journey, build healthy habits, and access support."
        path="/apps/healthwise"
      />
      <div className="max-w-5xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 text-sm hover:text-white" data-testid="link-home">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="grid md:grid-cols-2 gap-10 items-center mt-10">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase rounded-full px-3 py-1" style={{ background: `${GOLD}1a`, color: GOLD }}>
              <Sparkles className="h-3.5 w-3.5" /> Mobile App
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mt-4" data-testid="text-product-title">Healthwisesupport</h1>
            <p className="text-white/70 text-lg mt-4">
              Your comprehensive wellness companion. Track your health journey, build better habits,
              and stay supported every step of the way.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <a
                href={APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-5 py-3"
                style={{ background: GOLD, color: "#0a1124" }}
                data-testid="link-open-app"
              >
                Open the app <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-5 py-3 border border-white/20 hover:bg-white/5"
                data-testid="link-pricing"
              >
                View plans
              </Link>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 p-8 flex items-center justify-center">
            <img src={appHealthwise} alt="Healthwisesupport app interface" loading="lazy" className="w-full h-full object-contain" data-testid="img-product" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 mt-16">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid={`card-feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <f.icon className="h-6 w-6" style={{ color: GOLD }} />
              <h3 className="font-semibold mt-3">{f.title}</h3>
              <p className="text-white/60 text-sm mt-1">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 mt-12 text-center">
          <h2 className="text-2xl font-bold">Unlock more across Elevate360</h2>
          <p className="text-white/60 mt-2 max-w-xl mx-auto">
            Create a free account to use the AI Concierge and manage your premium plan.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-5 py-3"
              style={{ background: GOLD, color: "#0a1124" }}
              data-testid="link-account"
            >
              {isAuthenticated ? "Manage account" : "Create free account"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
