/**
 * Premium presentation detail for each consultation offer, keyed by exact title.
 * The DB (consultations table) stays the source of truth for title/price/duration;
 * this layer adds the marketing-grade outcome bullets, "best for" line, and a trust
 * note used to elevate each card. Titles missing here fall back to a safe default.
 */
export type SessionDetail = {
  /** 2–4 concrete outcomes the client walks away with. */
  outcomes: string[];
  /** Who this session is the right fit for. */
  bestFor: string;
  /** Reassurance line shown under the CTA. */
  trustNote: string;
};

export const SESSION_DETAILS: Record<string, SessionDetail> = {
  "Brand Strategy Session": {
    outcomes: [
      "Clear positioning + messaging that sets you apart",
      "90-day growth roadmap with prioritized moves",
      "Audience + offer alignment for higher conversion",
    ],
    bestFor: "Founders & creators ready to sharpen their brand and scale.",
    trustNote: "Founder-led • Action plan delivered after the call.",
  },
  "AI Content Consultation": {
    outcomes: [
      "A repeatable AI content system you can run weekly",
      "Personalized content calendar template",
      "Platform-specific growth tactics that fit your niche",
    ],
    bestFor: "Creators who want to produce more, faster, without burning out.",
    trustNote: "Includes reusable templates • Tools-agnostic guidance.",
  },
  "Creative Direction Call": {
    outcomes: [
      "Expert feedback on visuals, copy, and aesthetic",
      "A cohesive premium look across every channel",
      "Concrete fixes you can apply immediately",
    ],
    bestFor: "Brands that want their presentation to feel high-end and intentional.",
    trustNote: "Honest, specific critique • No vague feedback.",
  },
  "App / Product Consultation": {
    outcomes: [
      "Validated concept + UX direction for your product",
      "Monetization model that fits your audience",
      "Launch + growth plan from idea to market",
    ],
    bestFor: "Founders building an app or digital product who want a clear path.",
    trustNote: "Built by a team shipping live apps • Practical, not theoretical.",
  },
  "Collaboration Discovery Call": {
    outcomes: [
      "Explore partnership, licensing, or co-creation fit",
      "Clarity on scope, value, and next steps",
      "A founder-to-founder conversation, no pressure",
    ],
    bestFor: "Brands & creators exploring a strategic partnership with Elevate360.",
    trustNote: "Free discovery call • No obligation.",
  },
  "Premium AI Brand Audit": {
    outcomes: [
      "Full diagnostic across brand, content & digital presence",
      "Prioritized list of the highest-leverage improvements",
      "A written summary with scores and recommended actions",
    ],
    bestFor: "Established creators who want an expert, data-backed gut check.",
    trustNote: "Written report delivered • Powered by Elevate360 AI + founder review.",
  },
  "Founder Growth Strategy Session": {
    outcomes: [
      "A personal founder growth roadmap built around you",
      "Positioning + monetization aligned to your strengths",
      "Systems that scale you without the burnout",
    ],
    bestFor: "Solo founders ready to grow revenue and influence sustainably.",
    trustNote: "Founder-led • Designed for long-term, compounding growth.",
  },
};

export const DEFAULT_SESSION_DETAIL: SessionDetail = {
  outcomes: [
    "A focused, founder-guided working session",
    "Clear, actionable next steps tailored to you",
  ],
  bestFor: "Creators and founders ready to take the next step with Elevate360.",
  trustNote: "Founder-led • Practical guidance you can act on.",
};
