import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag, Loader2, Sparkles, Lock } from "lucide-react";
import SEO from "@/components/SEO";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  stripePriceId: string;
  deliveryType: "link" | "content";
  featured: boolean;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "usd").toUpperCase() }).format(cents / 100);
}

function ProductCard({ product }: { product: Product }) {
  const [error, setError] = useState("");
  const checkout = useMutation({
    mutationFn: async () => {
      const chatSessionId = sessionStorage.getItem("e360_chat_session") || undefined;
      const r = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: product.slug, sessionId: chatSessionId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Checkout unavailable");
      if (!data.url) throw new Error("Checkout unavailable");
      return data.url as string;
    },
    onSuccess: (url) => { window.location.href = url; },
    onError: (e: any) => setError(e.message),
  });

  const buyable = !!product.stripePriceId;

  return (
    <article className="lux-card flex flex-col" data-testid={`card-product-${product.id}`}>
      {product.imageUrl && (
        <img src={product.imageUrl} alt={product.name} className="w-full h-44 object-cover rounded-lg mb-4" />
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#F4A62A]">{product.category}</span>
        {product.featured && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#F4A62A] border border-[#F4A62A]/40 rounded px-1.5 py-0.5">Featured</span>
        )}
      </div>
      <h3 className="font-bold text-white text-lg mt-1.5 leading-snug" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
      {product.description && (
        <p className="text-sm text-white/60 mt-2 leading-relaxed flex-1">{product.description}</p>
      )}
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-2xl font-black text-white" data-testid={`text-product-price-${product.id}`}>
          {formatPrice(product.priceCents, product.currency)}
        </span>
        {buyable ? (
          <button
            onClick={() => { setError(""); checkout.mutate(); }}
            disabled={checkout.isPending}
            data-testid={`button-buy-${product.id}`}
            className="btn-primary px-5 py-2.5 flex items-center gap-2 text-sm"
          >
            {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
            Buy now
          </button>
        ) : (
          <span className="text-xs text-white/40 border border-white/15 rounded-lg px-3 py-2" data-testid={`text-product-soon-${product.id}`}>
            Coming soon
          </span>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-3" data-testid={`text-buy-error-${product.id}`}>{error}</p>}
    </article>
  );
}

export default function Marketplace() {
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/marketplace"],
    queryFn: async () => {
      const r = await fetch("/api/marketplace");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 50% 8%)" }}>
      <SEO
        title="Marketplace | Elevate360Official"
        description="Premium digital products from Elevate360Official — tools, templates, and resources delivered instantly."
        path="/marketplace"
      />
      <header className="border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(7,11,19,0.92)" }}>
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/"><img src={brandLogo} alt="Elevate360" className="h-8 w-auto" /></Link>
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition" data-testid="link-back-home">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-16 max-w-5xl">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#F4A62A]/30 text-[#F4A62A] text-xs font-semibold mb-5">
            <Sparkles className="h-3.5 w-3.5" /> Marketplace
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight" data-testid="text-marketplace-heading">
            Digital Products
          </h1>
          <p className="text-white/55 max-w-2xl mx-auto mt-4 leading-relaxed">
            Premium tools, templates, and resources from the Elevate360 ecosystem — delivered instantly after purchase.
          </p>
        </div>

        {isLoading ? (
          <p className="text-center text-white/40" data-testid="text-marketplace-loading">Loading…</p>
        ) : products.length === 0 ? (
          <div className="text-center text-white/40" data-testid="text-marketplace-empty">
            <Lock className="h-8 w-8 mx-auto mb-3 opacity-40" />
            New products are on the way. Check back soon.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}
