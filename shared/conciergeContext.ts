// Sprint 71.1 — Context-aware AI Concierge.
// Single source of truth for per-page concierge context. Imported by BOTH:
//   - client (via client/src/config/conciergeContext.ts re-export) for greetings/UI
//   - server (server/ai/prompts.ts) for system-prompt injection
// The server NEVER trusts client-sent knowledge/CTA text — it only receives the
// page path and looks the rest up here itself (prompt-injection safe).

export interface ConciergeLink {
  label: string;
  url: string;
}

export interface ConciergePageContext {
  /** Human-readable page title, e.g. "Video Crafter" */
  pageTitle: string;
  /** Site section grouping, e.g. "Applications" */
  section: string;
  /** Product the page is about, when applicable */
  product?: string;
  /** Client-side: first assistant message shown when the widget opens on this page */
  greeting: string;
  /** Server-side: page-specific knowledge injected into the system prompt */
  knowledge: string;
  /** Server-side: the CTA the concierge should steer toward on this page */
  suggestedCta: string;
  /** Server-side: links the concierge may recommend on this page */
  recommendedLinks: ConciergeLink[];
}

const SITE = "https://www.elevate360official.com";

export const CONCIERGE_PAGE_CONTEXTS: Record<string, ConciergePageContext> = {
  "/": {
    pageTitle: "Home",
    section: "Home",
    greeting:
      "Welcome to Elevate360. I can help you discover AI solutions, digital tools, books, and growth strategies. What brings you here today?",
    knowledge:
      "The visitor is on the Elevate360 homepage, which showcases the full brand ecosystem: mobile apps (Bondedlove, Healthwisesupport, Video Crafter), Amazon KDP books, the Etsy Art Studio, Audiomack music, consultation sessions, and the blog.",
    suggestedCta:
      "Help them find the right product or section; if they want tailored guidance, suggest booking a strategy session.",
    recommendedLinks: [
      { label: "Book a Session", url: `${SITE}/#book-session` },
      { label: "Explore Apps", url: `${SITE}/#apps` },
      { label: "Blog", url: `${SITE}/blog` },
    ],
  },
  "/apps/bondedlove": {
    pageTitle: "BondedLove",
    section: "Applications",
    product: "BondedLove",
    greeting:
      "Looking for meaningful relationships? I can help you explore BondedLove — what would you like to know?",
    knowledge:
      "The visitor is on the BondedLove product page. BondedLove is a dating app focused on fostering genuine, lasting connections rather than endless swiping. App site: https://bondedlove.elevate360official.com. The related book 'Together: Let There Be Love' (https://www.amazon.com/dp/B0G5DWG61V) pairs well for couples building deeper connection.",
    suggestedCta:
      "Guide them to try BondedLove at https://bondedlove.elevate360official.com; mention the 'Together: Let There Be Love' book when relationship-building comes up.",
    recommendedLinks: [
      { label: "Visit BondedLove", url: "https://bondedlove.elevate360official.com" },
      { label: "Together: Let There Be Love (book)", url: "https://www.amazon.com/dp/B0G5DWG61V" },
    ],
  },
  "/apps/healthwise": {
    pageTitle: "HealthWise",
    section: "Applications",
    product: "Healthwisesupport",
    greeting:
      "Curious about HealthWise? I can explain how it works and who it's designed for.",
    knowledge:
      "The visitor is on the HealthWise product page. Healthwisesupport is a comprehensive health & wellness companion for tracking a wellness journey and connecting with healthcare professionals. App site: https://health.elevate360official.com. Related books: 'Healthwise: Stay Healthy' (https://www.amazon.com/dp/B0GMBNPZC9) and 'One Clean Meal: A 7-Day Reset' (https://www.amazon.com/dp/B0FSDTPVJC).",
    suggestedCta:
      "Guide them to https://health.elevate360official.com; recommend the Healthwise or One Clean Meal books for readers focused on daily health habits.",
    recommendedLinks: [
      { label: "Visit HealthWise", url: "https://health.elevate360official.com" },
      { label: "Healthwise: Stay Healthy (book)", url: "https://www.amazon.com/dp/B0GMBNPZC9" },
      { label: "One Clean Meal (book)", url: "https://www.amazon.com/dp/B0FSDTPVJC" },
    ],
  },
  "/apps/video-crafter": {
    pageTitle: "Video Crafter",
    section: "Applications",
    product: "Video Crafter",
    greeting: "Let's build your next AI-powered video together. What are you creating?",
    knowledge:
      "The visitor is on the Video Crafter product page. Video Crafter is an intuitive video editing suite with professional-grade tools made accessible for creators of all levels. App site: https://crafter.elevate360official.com.",
    suggestedCta:
      "Guide them to https://crafter.elevate360official.com; creators wanting content strategy can book an AI Content Consultation.",
    recommendedLinks: [
      { label: "Visit Video Crafter", url: "https://crafter.elevate360official.com" },
      { label: "Book a Session", url: `${SITE}/#book-session` },
    ],
  },
  "/blog": {
    pageTitle: "Blog",
    section: "Content",
    greeting:
      "Welcome to the Elevate360 blog. I can point you to articles on apps, books, music, and entrepreneurship — what interests you?",
    knowledge:
      "The visitor is reading the Elevate360 blog, which covers entrepreneurship, the brand ecosystem, books, music, and health topics.",
    suggestedCta:
      "Recommend relevant articles or the newsletter; if they want deeper guidance, suggest a strategy session.",
    recommendedLinks: [
      { label: "All Articles", url: `${SITE}/blog` },
      { label: "Knowledge Center", url: `${SITE}/knowledge` },
    ],
  },
  "/knowledge": {
    pageTitle: "Knowledge Center",
    section: "Content",
    greeting: "Ask me to summarize an article or recommend your next topic.",
    knowledge:
      "The visitor is in the Knowledge Center — Elevate360's library of in-depth articles and guides.",
    suggestedCta:
      "Help them navigate articles, summarize topics, or recommend what to read next.",
    recommendedLinks: [
      { label: "Knowledge Center", url: `${SITE}/knowledge` },
      { label: "Blog", url: `${SITE}/blog` },
    ],
  },
  "/about-founder": {
    pageTitle: "About the Founder",
    section: "Brand",
    greeting:
      "Want to know the story behind Elevate360? Ask me anything about Oladele Oyeniyi and the brand mission.",
    knowledge:
      "The visitor is on the founder page about Oladele Oyeniyi — creator of Elevate360Official, author of three books, app builder, artist, and musician. Brand mission: 'Empowering Lives Through Technology & Words.'",
    suggestedCta:
      "Share the founder story; interested visitors can book a session or explore the press kit.",
    recommendedLinks: [
      { label: "Press Kit", url: `${SITE}/press-kit` },
      { label: "Book a Session", url: `${SITE}/#book-session` },
    ],
  },
  "/strategy-session": {
    pageTitle: "Strategy Session",
    section: "Consulting",
    greeting: "I can answer questions before you schedule your consultation.",
    knowledge:
      "The visitor is on the Strategy Session page, exploring paid 1:1 consultations (brand strategy, AI content, creative direction, app/product, collaboration, brand audit, founder growth).",
    suggestedCta:
      "Answer pre-booking questions and guide them to book the most relevant session at " +
      `${SITE}/#book-session.`,
    recommendedLinks: [{ label: "Book a Session", url: `${SITE}/#book-session` }],
  },
  "/guide": {
    pageTitle: "AI Growth Guide",
    section: "Lead Magnet",
    greeting:
      "Grabbing the AI Growth Guide? I can tell you what's inside and how to apply it.",
    knowledge:
      "The visitor is on the free AI Growth Guide download page (email opt-in lead magnet about growing with AI tools).",
    suggestedCta: "Encourage the free download; follow-up questions can lead to a strategy session.",
    recommendedLinks: [{ label: "Book a Session", url: `${SITE}/#book-session` }],
  },
  "/press-kit": {
    pageTitle: "Press Kit",
    section: "Brand",
    greeting:
      "Media or partnership inquiry? I can walk you through the brand, assets, and how to get in touch.",
    knowledge:
      "The visitor is on the Press Kit page with brand assets, bio, and media resources for journalists and partners.",
    suggestedCta: "Help with press/partnership questions; direct them to the contact form.",
    recommendedLinks: [{ label: "Contact", url: `${SITE}/#contact` }],
  },
  "/pricing": {
    pageTitle: "Pricing",
    section: "Premium",
    greeting:
      "Comparing plans? I can explain what each tier includes and help you pick the right one.",
    knowledge:
      "The visitor is on the Pricing page comparing premium plans (Free / Starter / Pro) that include monthly AI concierge credits and premium features.",
    suggestedCta: "Explain plan differences; guide them to sign up or upgrade on this page.",
    recommendedLinks: [
      { label: "Pricing", url: `${SITE}/pricing` },
      { label: "Account", url: `${SITE}/account` },
    ],
  },
  "/account": {
    pageTitle: "Account",
    section: "Premium",
    greeting: "Need help with your account, plan, or AI credits? I'm here.",
    knowledge:
      "The visitor is on their Account page (sign in / sign up, subscription management, AI credit balance).",
    suggestedCta: "Help with account, plan, or credit questions; upgrades happen via the Pricing page.",
    recommendedLinks: [{ label: "Pricing", url: `${SITE}/pricing` }],
  },
  "/marketplace": {
    pageTitle: "AI Marketplace",
    section: "Commerce",
    greeting:
      "Browsing the AI Marketplace? I can help you pick the right digital product for your goals.",
    knowledge:
      "The visitor is in the AI Marketplace of instantly-delivered digital products (templates, guides, tools) purchasable via Stripe checkout.",
    suggestedCta: "Help them choose a product; delivery is instant after checkout.",
    recommendedLinks: [{ label: "Marketplace", url: `${SITE}/marketplace` }],
  },
  "/founder": {
    pageTitle: "Founder Authority",
    section: "Brand",
    greeting:
      "Exploring the founder's credentials and press features? Ask me anything about the journey.",
    knowledge:
      "The visitor is on the public Founder Authority page listing awards, credentials, press mentions, and milestones of Oladele Oyeniyi.",
    suggestedCta: "Share credibility highlights; media inquiries go to the press kit or contact form.",
    recommendedLinks: [
      { label: "Press Kit", url: `${SITE}/press-kit` },
      { label: "About the Founder", url: `${SITE}/about-founder` },
    ],
  },
  "/links": {
    pageTitle: "Links",
    section: "Brand",
    greeting: "All of Elevate360 in one place — want a quick tour of what we offer?",
    knowledge: "The visitor is on the link-in-bio page listing every Elevate360 destination.",
    suggestedCta: "Point them to the destination that matches their interest.",
    recommendedLinks: [{ label: "Home", url: SITE }],
  },
};

/**
 * Normalize a raw client path to a known context key.
 * - strips query/hash and trailing slashes
 * - collapses dynamic child routes (/blog/:slug → /blog, /knowledge/:slug → /knowledge)
 * - returns null for unknown or non-public routes (admin routes never leak into prompts)
 */
export function resolveConciergePagePath(rawPath: string): string | null {
  if (!rawPath || typeof rawPath !== "string") return null;
  let path = rawPath.split(/[?#]/)[0].trim().toLowerCase();
  if (!path.startsWith("/")) return null;
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
  if (CONCIERGE_PAGE_CONTEXTS[path]) return path;
  if (path.startsWith("/blog/")) return "/blog";
  if (path.startsWith("/knowledge/")) return "/knowledge";
  return null;
}

/** Look up the context entry for a raw path, or null when the page is unknown. */
export function getConciergePageContext(rawPath: string): ConciergePageContext | null {
  const key = resolveConciergePagePath(rawPath);
  return key ? CONCIERGE_PAGE_CONTEXTS[key] : null;
}
