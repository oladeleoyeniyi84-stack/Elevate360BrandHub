import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { Printer, ArrowLeft, Mail, Globe, Palette, Type, Package } from "lucide-react";
import SEO from "@/components/SEO";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

const BRAND_COLORS = [
  { name: "Primary Gold", hex: "#F4A62A", hsl: "43° 90% 56%", use: "CTAs, highlights, brand identity" },
  { name: "Navy Background", hex: "#0d1a2e", hsl: "220° 50% 12%", use: "Primary background" },
  { name: "Deep Navy", hex: "#070b13", hsl: "220° 50% 6%", use: "Footer, deep sections" },
  { name: "Amber Accent", hex: "#fbbf24", hsl: "43° 96% 56%", use: "Gradient highlights" },
  { name: "White Text", hex: "#ffffff", hsl: "0° 0% 100%", use: "Headings, primary text" },
  { name: "Muted Text", hex: "rgba(255,255,255,0.55)", hsl: "—", use: "Body copy, secondary text" },
];

const PRODUCTS = [
  { category: "Mobile Apps", items: ["Bondedlove — Couples relationship & communication app", "Healthwisesupport — Wellness & health tracking app", "Video Crafter — Creative video editing & production app"] },
  { category: "Books (Amazon KDP)", items: ["Healthwise: Stay Healthy — Wellness & nutrition guide", "Together: Let There Be Love — Relationship & couples guide", "One Clean Meal — Healthy eating & meal planning"] },
  { category: "Art Studio", items: ["Elevate360 Art Studio on Etsy — Custom digital & print art commissions"] },
  { category: "Music", items: ["Elevate360Music on Audiomack — Original music across multiple genres"] },
];

export default function PressKit() {
  return (
    <div className="min-h-screen bg-white text-gray-900 press-kit-page">
      <SEO
        title="Press Kit | Elevate360Official"
        description="Official press kit for Elevate360Official — founder profile, brand overview, product portfolio, and media assets."
        path="/press-kit"
      />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .press-kit-page { background: white !important; }
          body { background: white !important; }
          @page { margin: 1.5cm; }
        }
        @media screen {
          .press-kit-page { background: #f9fafb; }
        }
      `}</style>

      {/* Screen nav only */}
      <nav className="no-print sticky top-0 z-50 bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm transition">
          <ArrowLeft className="h-4 w-4" />
          Back to site
        </Link>
        <button
          onClick={() => window.print()}
          data-testid="button-print-presskit"
          className="flex items-center gap-2 bg-[#F4A62A] text-[#0d1a2e] font-bold text-sm px-4 py-2 rounded-lg hover:bg-amber-400 transition"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </nav>

      {/* Kit content */}
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-12 pb-8 border-b-2 border-[#F4A62A]">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white" style={{ background: "#0d1a2e" }}>
            E360
          </div>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Elevate360Official</h1>
            <p className="text-[#F4A62A] font-bold text-lg mt-1">Brand Media & Press Kit</p>
            <p className="text-gray-500 text-sm mt-1">Elevate the world, one product at a time.</p>
          </div>
          <div className="sm:ml-auto text-right text-xs text-gray-400">
            <p>Updated {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            <p className="font-semibold text-gray-600">www.elevate360official.com</p>
          </div>
        </div>

        {/* Brand Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 rounded" style={{ background: "#F4A62A", display: "inline-block" }} />
            Brand Overview
          </h2>
          <p className="text-gray-700 leading-relaxed text-base mb-4">
            <strong>Elevate360Official</strong> is a multi-vertical creative brand founded by <strong>Oladele Oyeniyi</strong>, built on the belief that technology, creativity, and words have the power to transform lives. From mobile applications that strengthen relationships and support wellness, to books that educate and inspire, music that moves, and art that speaks — Elevate360 is a living ecosystem of impact.
          </p>
          <p className="text-gray-700 leading-relaxed text-base">
            Operating at the intersection of entrepreneurship, health, love, and creativity, Elevate360Official has touched over 10,000 lives globally through its growing portfolio of digital products and creative content.
          </p>
        </section>

        {/* Founder */}
        <section className="mb-12 bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 rounded" style={{ background: "#F4A62A", display: "inline-block" }} />
            Founder
          </h2>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0" style={{ background: "#0d1a2e" }}>OO</div>
            <div>
              <p className="text-xl font-bold text-gray-900">Oladele Oyeniyi</p>
              <p className="text-[#F4A62A] font-semibold text-sm mb-3">Entrepreneur · Author · App Developer · Visual Artist · Music Producer</p>
              <p className="text-gray-700 text-sm leading-relaxed">
                Oladele is a serial creator and entrepreneur who has built apps, published books, created art, and produced music — all under a single unified brand vision. He is available for podcast interviews, speaking engagements, brand partnerships, and media features.
              </p>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-1 h-6 rounded" style={{ background: "#F4A62A", display: "inline-block" }} />
            Products & Properties
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PRODUCTS.map(({ category, items }) => (
              <div key={category} className="border border-gray-200 rounded-xl p-4">
                <p className="font-bold text-gray-900 text-sm mb-3 uppercase tracking-wide">{category}</p>
                <ul className="space-y-1">
                  {items.map(item => (
                    <li key={item} className="text-gray-600 text-sm flex items-start gap-2">
                      <span className="text-[#F4A62A] font-bold mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Brand Colors */}
        <section className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <Palette className="h-5 w-5 text-[#F4A62A]" />
            Brand Colours
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BRAND_COLORS.map(c => (
              <div key={c.name} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="h-12 w-full" style={{ background: c.hex === "rgba(255,255,255,0.55)" ? "#a0a0a0" : c.hex }} />
                <div className="p-3">
                  <p className="font-bold text-gray-900 text-xs">{c.name}</p>
                  <p className="text-gray-500 text-xs font-mono">{c.hex}</p>
                  <p className="text-gray-400 text-xs mt-1">{c.use}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <Type className="h-5 w-5 text-[#F4A62A]" />
            Typography
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Headings</p>
              <p className="text-2xl font-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Plus Jakarta Sans</p>
              <p className="text-sm text-gray-500 mt-1">800 weight · Tight tracking</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Body</p>
              <p className="text-xl" style={{ fontFamily: "Inter, sans-serif" }}>Inter</p>
              <p className="text-sm text-gray-500 mt-1">400–600 weight · Relaxed leading</p>
            </div>
          </div>
        </section>

        {/* Key Stats */}
        <section className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-[#F4A62A]" />
            Key Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[["3", "Mobile Apps"], ["3", "Books Published"], ["1", "Art Studio"], ["10K+", "Lives Reached"]].map(([n, l]) => (
              <div key={l} className="border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-[#F4A62A]">{n}</p>
                <p className="text-gray-600 text-sm mt-1">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="border-t-2 border-[#F4A62A] pt-8">
          <h2 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#F4A62A]" />
            Media Contact
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Mail, label: "Email", value: "weareelevate360@gmail.com" },
              { icon: Globe, label: "Website", value: "www.elevate360official.com" },
              { icon: Globe, label: "Links", value: "elevate360official.com/links" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-[#F4A62A]" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest">{label}</p>
                  <p className="text-gray-800 font-semibold text-sm">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-6">
            © {new Date().getFullYear()} Elevate360Official. All rights reserved. Assets in this press kit are for editorial and media use only.
          </p>
        </section>

      </div>
    </div>
  );
}
