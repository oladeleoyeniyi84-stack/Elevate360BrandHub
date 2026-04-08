import { useState, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface FAQ {
  q: string;
  a: string;
}

interface FAQItemProps {
  faq: FAQ;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ faq, index, isOpen, onToggle }: FAQItemProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden transition-colors hover:border-primary/30">
      <button
        onClick={onToggle}
        data-testid={`faq-toggle-${index}`}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="font-semibold text-base md:text-lg text-foreground leading-snug pr-2">{faq.q}</span>
        <ChevronDown
          className={`w-5 h-5 flex-none text-primary transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
        />
      </button>

      <div
        ref={bodyRef}
        style={{
          maxHeight: isOpen ? `${bodyRef.current?.scrollHeight ?? 400}px` : "0px",
          opacity: isOpen ? 1 : 0,
        }}
        className="overflow-hidden transition-all duration-300 ease-in-out"
      >
        <p className="px-6 pb-6 text-muted-foreground leading-relaxed text-sm md:text-base">{faq.a}</p>
      </div>
    </div>
  );
}

export function FAQSection({ faqs }: { faqs: FAQ[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const half = Math.ceil(faqs.length / 2);
  const leftCol = faqs.slice(0, half);
  const rightCol = faqs.slice(half);

  return (
    <section className="py-24 border-t border-white/10" id="faq">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <p className="text-xs font-bold tracking-widest text-primary uppercase">Got Questions?</p>
          <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">Frequently Asked</h2>
          <p className="text-muted-foreground text-lg">Everything you need to know about Elevate360 and our products.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
          <div className="flex flex-col gap-4">
            {leftCol.map((faq, i) => (
              <FAQItem
                key={i}
                faq={faq}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {rightCol.map((faq, i) => {
              const globalIdx = i + half;
              return (
                <FAQItem
                  key={globalIdx}
                  faq={faq}
                  index={globalIdx}
                  isOpen={openIndex === globalIdx}
                  onToggle={() => setOpenIndex(openIndex === globalIdx ? null : globalIdx)}
                />
              );
            })}
          </div>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-10">
          Still have questions?{" "}
          <button
            onClick={() => document.getElementById("contact-trigger")?.click()}
            className="text-primary font-semibold hover:underline focus:outline-none"
            data-testid="faq-contact-link"
          >
            Send us a message →
          </button>
        </p>
      </div>
    </section>
  );
}
