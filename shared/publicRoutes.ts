// Public route inventory. This is deliberately framework-neutral so the
// server, sitemap, and crawler tests share one definition of indexable URLs.

export type PublicRoute = {
  path: string;
  title: string;
  description: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
  ogType?: "article";
};

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: "/", title: "Elevate360Official | Empowering Lives Through Technology & Words", description: "Elevate360Official by Oladele Oyeniyi — a digital brand ecosystem of mobile apps, books, original music, art, and digital services.", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", title: "Blog | Elevate360Official", description: "Read insights, inspiration, and updates from Elevate360Official on wellness, creativity, technology, relationships, and growth.", changefreq: "daily", priority: "0.9", ogType: "article" },
  { path: "/links", title: "Links | Elevate360Official", description: "Explore all official Elevate360Official links — apps, books, music, art, and brand channels by Oladele Oyeniyi.", changefreq: "monthly", priority: "0.8" },
  { path: "/press-kit", title: "Press Kit | Elevate360Official", description: "Access the official Elevate360Official press kit — brand overview, founder profile, product portfolio, and media assets.", changefreq: "monthly", priority: "0.7" },
  { path: "/founder", title: "Founder Authority | Elevate360Official", description: "Media features, milestones, credentials, and awards establishing the authority of Oladele Oyeniyi, founder of Elevate360Official.", changefreq: "monthly", priority: "0.8", ogType: "article" },
  { path: "/about-founder", title: "About the Founder — Oladele Oyeniyi | Elevate360Official", description: "Meet Oladele Oyeniyi, founder of Elevate360 — app developer, author, visual artist, and music producer building products that elevate everyday life.", changefreq: "monthly", priority: "0.8", ogType: "article" },
  { path: "/marketplace", title: "Marketplace | Elevate360Official", description: "Premium digital products from Elevate360Official — tools, templates, and resources delivered instantly.", changefreq: "weekly", priority: "0.9" },
  { path: "/guide", title: "Free AI Growth Playbook | Elevate360Official", description: "Get the free AI Growth Playbook — practical ways to apply AI in your brand, a prompt library, and a 30-day rollout plan.", changefreq: "monthly", priority: "0.7", ogType: "article" },
  { path: "/knowledge", title: "Knowledge Center | Elevate360Official", description: "Browse the Elevate360Official knowledge center — articles and resources on wellness, relationships, creativity and technology.", changefreq: "weekly", priority: "0.7" },
  { path: "/strategy-session", title: "AI Growth Strategy Session — Launch Offer $97 | Elevate360Official", description: "Book a 1:1 AI Growth Strategy Session with the founder of Elevate360. Get a custom AI growth roadmap and a 30-day action plan.", changefreq: "monthly", priority: "0.6", ogType: "article" },
  { path: "/pricing", title: "Pricing | Elevate360Official", description: "Choose a plan to unlock more AI Concierge credits and premium features from Elevate360Official.", changefreq: "monthly", priority: "0.6" },
  { path: "/work", title: "Our Work, Collaborations & Digital Projects | Elevate360Official", description: "Explore Elevate360Official’s flagship platforms, AI systems, nonprofit collaborations, intelligent websites, digital experiences, analytics infrastructure, and current initiatives.", changefreq: "weekly", priority: "0.8" },
  { path: "/apps/bondedlove", title: "Bondedlove — Dating App | Elevate360Official", description: "Learn about Bondedlove, a relationship-focused app from Elevate360Official.", changefreq: "monthly", priority: "0.6" },
  { path: "/apps/healthwise", title: "Healthwisesupport — Wellness App | Elevate360Official", description: "Learn about Healthwisesupport, a wellness app from Elevate360Official.", changefreq: "monthly", priority: "0.6" },
  { path: "/apps/video-crafter", title: "Video Crafter — Video Editing Suite | Elevate360Official", description: "Learn about Video Crafter, a video editing suite from Elevate360Official.", changefreq: "monthly", priority: "0.6" },
];

export const PUBLIC_ROUTE_PATHS: ReadonlySet<string> = new Set(PUBLIC_ROUTES.map((route) => route.path));

export const KNOWLEDGE_ARTICLES = [
  ["building-a-digital-brand-that-lasts", "Building a Digital Brand That Lasts", "A durable brand is a promise kept consistently across every product, page, and conversation.", "2026-01-12"],
  ["how-ai-is-changing-solo-founders", "How AI Is Changing the Solo Founder", "One person can now run workflows that once required a full team; judgment remains essential.", "2026-01-20"],
  ["the-economics-of-digital-products", "The Economics of Digital Products", "Understanding digital-product leverage, reach, conversion, and retention.", "2026-02-02"],
  ["designing-apps-people-actually-keep", "Designing Apps People Actually Keep", "Retention starts when an app solves a real problem on the first screen.", "2026-02-15"],
  ["writing-and-publishing-with-intention", "Writing and Publishing With Intention", "Self-publishing makes careful, reader-focused writing more important.", "2026-02-26"],
  ["creativity-as-a-daily-practice", "Creativity as a Daily Practice", "A consistent creative practice is more dependable than inspiration.", "2026-03-08"],
  ["wellness-for-people-who-build", "Wellness for People Who Build", "Sustainable energy and healthy boundaries support long-term work.", "2026-03-19"],
  ["relationships-and-the-modern-life", "Relationships and the Modern Life", "Real connection requires attention, consistency, and presence.", "2026-03-30"],
  ["the-discipline-of-shipping", "The Discipline of Shipping", "Finished work creates learning and momentum.", "2026-04-10"],
  ["turning-an-audience-into-a-community", "Turning an Audience Into a Community", "Communities grow through participation, belonging, and consistency.", "2026-04-22"],
] as const;

export const KNOWLEDGE_ARTICLE_SLUGS: ReadonlySet<string> = new Set(KNOWLEDGE_ARTICLES.map(([slug]) => slug));