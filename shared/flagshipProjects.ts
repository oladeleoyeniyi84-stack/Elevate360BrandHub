// Phase 72.6 — Public flagship work & collaborations configuration.
//
// SINGLE source of truth for the homepage showcase, the /work portfolio page,
// and the server-delivered /work structured data. Shared (not client-only) so
// the crawler-visible JSON-LD and the hydrated page can never disagree.
//
// PUBLIC-BOUNDARY RULES (enforced by helpers below + phase tests):
// - `confidential` records never render anywhere public.
// - `limited_public` records render ONLY the approved summary language stored
//   here — nothing is fetched or derived from private systems.
// - Statuses come from a controlled union; no fake percent-complete values.
// - No unverified performance claims, endorsements, or completion claims.

export const PROJECT_STATUSES = [
  "Live",
  "Completed",
  "Active Collaboration",
  "Strategic Collaboration",
  "In Development",
  "Pilot",
  "Strategic Initiative",
  "Private Client Engagement",
  "Ongoing Capability",
  "Active",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_VISIBILITIES = ["public", "limited_public", "confidential"] as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number];

export const INITIATIVE_PHASES = [
  "Discovery",
  "Strategy",
  "Design",
  "Engineering",
  "Review",
  "Pilot",
  "Live",
  "Ongoing",
] as const;
export type InitiativePhase = (typeof INITIATIVE_PHASES)[number];

export const WORK_FILTERS = [
  "All",
  "AI & Automation",
  "Websites & Platforms",
  "Nonprofit & Community",
  "Creative Experiences",
  "Analytics & Growth",
  "Current Initiatives",
] as const;
export type WorkFilter = (typeof WORK_FILTERS)[number];

export interface FlagshipProject {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  summary: string; // 25-45 words, card copy
  fullDescription: string; // /work long copy
  status: ProjectStatus;
  visibility: ProjectVisibility;
  featured: boolean;
  homepageFeatured: boolean;
  capabilities: string[]; // chips (cards show max 5)
  outcomes?: string[]; // only verified, approved outcomes — no metrics claims
  collaborationType?: string;
  organization?: string;
  publicOrganizationName?: string;
  externalUrl?: string;
  internalRoute?: string;
  image?: string;
  altText?: string;
  startDateLabel?: string;
  currentPhase?: InitiativePhase;
  disclaimer?: string;
  governanceNote?: string;
  ctaLabel: string;
  ctaRoute: string; // internal route or external URL (matches externalUrl when external)
  workSection: "featured" | "collaborations" | "initiatives" | "creative";
  filters: Exclude<WorkFilter, "All">[];
  sortOrder: number;
}

export interface CurrentInitiative {
  projectId: string;
  phase: InitiativePhase;
  focus: string; // public, non-confidential current focus
  nextMilestone: string; // public milestone only
  collaborationType: string;
  lastUpdatedLabel: string; // static human-readable label, maintained here
}

const CONSULT_ROUTE = "/strategy-session";

export const FLAGSHIP_PROJECTS: FlagshipProject[] = [
  {
    id: "elevate360-ecosystem",
    slug: "elevate360-digital-ecosystem",
    title: "Elevate360Official Digital Ecosystem",
    shortTitle: "Digital Ecosystem",
    category: "AI, Digital Platforms & Business Infrastructure",
    summary:
      "A growing ecosystem of intelligent websites, digital products, publishing, automation, analytics, music, creative media, and AI-enabled business services built under one unified brand.",
    fullDescription:
      "Elevate360Official is developing an integrated digital ecosystem that combines intelligent web platforms, business automation, analytics, content systems, publishing, music, creative products, customer engagement, and AI-supported decision tools.",
    status: "Live",
    visibility: "public",
    featured: true,
    homepageFeatured: true,
    capabilities: [
      "Full-stack web development",
      "AI integration",
      "Revenue analytics",
      "Business automation",
      "Digital publishing",
      "Creative technology",
    ],
    internalRoute: "/",
    ctaLabel: "Explore Elevate360Official",
    ctaRoute: "/",
    workSection: "featured",
    filters: ["Websites & Platforms", "AI & Automation"],
    sortOrder: 1,
  },
  {
    id: "search-intelligence",
    slug: "search-intelligence-growth-operations",
    title: "Search Intelligence & Growth Operations",
    shortTitle: "Search Intelligence",
    category: "SEO Intelligence, Analytics & Growth Operations",
    summary:
      "A founder-controlled intelligence system connecting Google Search Console, technical SEO audits, Core Web Vitals, organic attribution, revenue signals, and evidence-based growth actions.",
    fullDescription:
      "Elevate360Official created a production-grade Search Intelligence and Growth Operations system that synchronizes search-performance data, audits technical SEO, identifies high-value opportunities, assigns transparent priority scores, and preserves human approval over every recommended action.",
    status: "Live",
    visibility: "public",
    featured: true,
    homepageFeatured: true,
    capabilities: [
      "Search Console integration",
      "Scheduled synchronization",
      "Technical SEO auditing",
      "Core Web Vitals monitoring",
      "Founder approval workflow",
    ],
    governanceNote:
      "Recommendations are evidence-based and require human approval. The system does not autonomously alter public content.",
    ctaLabel: "Request a Similar System",
    ctaRoute: CONSULT_ROUTE,
    workSection: "featured",
    filters: ["Analytics & Growth", "AI & Automation"],
    sortOrder: 2,
  },
  {
    id: "operation-ascend",
    slug: "operation-ascend",
    title: "Operation ASCEND — House of Possibilities",
    shortTitle: "Operation ASCEND",
    category: "Nonprofit Digital Transformation & AI Strategy",
    summary:
      "A strategic digital transformation and AI initiative exploring how intelligent systems can support staff, families, leadership, internal knowledge access, and organizational decision-making.",
    fullDescription:
      "Operation ASCEND is a collaborative initiative focused on practical and responsible digital transformation for House of Possibilities. The work explores opportunities to improve internal knowledge access, staff support, family information, operational efficiency, and leadership decision-making.",
    status: "Active Collaboration",
    visibility: "limited_public",
    featured: true,
    homepageFeatured: true,
    capabilities: [
      "Staff support",
      "Family support",
      "Leadership enablement",
      "Knowledge access",
      "Responsible AI readiness",
    ],
    collaborationType: "Collaboration",
    publicOrganizationName: "House of Possibilities",
    disclaimer:
      "Project details shown here are limited to approved, non-confidential information. Internal documents, organizational data, technical findings, and implementation decisions remain private.",
    ctaLabel: "Discuss Nonprofit Transformation",
    ctaRoute: CONSULT_ROUTE,
    workSection: "collaborations",
    filters: ["Nonprofit & Community", "AI & Automation", "Current Initiatives"],
    sortOrder: 3,
  },
  {
    id: "south-shore-ai",
    slug: "south-shore-ai-collaboration",
    title: "South Shore AI Collaboration",
    shortTitle: "South Shore AI",
    category: "AI Platform Strategy & Technical Advisory",
    summary:
      "Technical review, platform strategy, AI ecosystem analysis, and responsible implementation guidance supporting the development of an accessible regional AI-learning initiative.",
    fullDescription:
      "Elevate360Official has supported strategic and technical thinking around South Shore AI, including platform review, AI-tool evaluation, digital architecture considerations, security awareness, learning accessibility, and practical implementation planning.",
    status: "Strategic Collaboration",
    visibility: "limited_public",
    featured: true,
    homepageFeatured: true,
    capabilities: [
      "Platform review",
      "AI-tool evaluation",
      "Architecture guidance",
      "Learning accessibility",
      "Implementation planning",
    ],
    collaborationType: "Technical advisory",
    publicOrganizationName: "South Shore AI",
    disclaimer:
      "Only high-level, approved collaboration information is displayed. Private technical findings, security observations, credentials, planning documents, and unpublished recommendations are excluded.",
    ctaLabel: "Discuss AI Strategy",
    ctaRoute: CONSULT_ROUTE,
    workSection: "collaborations",
    filters: ["AI & Automation", "Nonprofit & Community", "Current Initiatives"],
    sortOrder: 4,
  },
  {
    id: "project-nehemiah",
    slug: "project-nehemiah",
    title: "Project Nehemiah — The Apostolic Church LAWNA Boston",
    shortTitle: "Project Nehemiah",
    category: "Intelligent Church Website & Ministry Platform",
    summary:
      "An intelligent church website initiative designed to strengthen digital ministry, communications, leadership access, member engagement, content publishing, and future AI-enabled service delivery.",
    fullDescription:
      "Project Nehemiah is the working initiative for an intelligent digital platform being developed for The Apostolic Church LAWNA Boston. The project is centered on creating a modern, secure, accessible, ministry-focused website that can support church communications, ministries, leadership, events, resources, media, and future intelligent assistance. Planned capabilities may include ministry and department pages, events and announcements, sermons and media, prayer and contact pathways, an intelligent website assistant, administrative publishing tools, and search and content discovery — all currently being developed.",
    status: "In Development",
    visibility: "limited_public",
    featured: true,
    homepageFeatured: true,
    capabilities: [
      "Ministry pages (planned)",
      "Events & announcements (planned)",
      "Sermons & media (planned)",
      "Intelligent assistant (planned)",
      "Mobile-responsive design",
    ],
    collaborationType: "In development",
    publicOrganizationName: "The Apostolic Church LAWNA Boston",
    disclaimer:
      "Feature scope and launch details remain subject to church leadership review and approval.",
    ctaLabel: "Discuss a Ministry Platform",
    ctaRoute: CONSULT_ROUTE,
    workSection: "initiatives",
    filters: ["Websites & Platforms", "Nonprofit & Community", "Current Initiatives"],
    sortOrder: 5,
  },
  {
    id: "ranti-dele-wedding",
    slug: "ranti-and-dele-wedding-experience",
    title: "Ranti & Dele Wedding Digital Experience",
    shortTitle: "Wedding Experience",
    category: "Private Event Technology & Wedding Planning",
    summary:
      "A personalized wedding-planning and guest-experience platform combining an interactive invitation, event details, travel guidance, accommodation information, registry access, and branded social sharing.",
    fullDescription:
      "The Ranti & Dele Wedding Digital Experience demonstrates how Elevate360Official applies technology, design, logistics, branding, and storytelling to a major personal event. The platform brings invitation presentation, ceremony and reception information, travel recommendations, hotel guidance, registry access, guest communication, and social-preview optimization into one cohesive experience.",
    status: "Active",
    visibility: "public",
    featured: true,
    homepageFeatured: true,
    capabilities: [
      "Interactive digital invitation",
      "Travel & hotel guidance",
      "Registry integration",
      "Mobile guest experience",
      "Custom domain configuration",
    ],
    externalUrl: "https://rantianddele.com",
    startDateLabel: "Launching September 2026",
    disclaimer:
      "Private addresses, schedules, guest information, and planning details are not published.",
    ctaLabel: "Visit Wedding Experience",
    ctaRoute: "https://rantianddele.com",
    workSection: "creative",
    filters: ["Creative Experiences", "Websites & Platforms"],
    sortOrder: 6,
  },
  {
    id: "revenue-intelligence",
    slug: "revenue-intelligence-system",
    title: "Revenue Intelligence System",
    shortTitle: "Revenue Intelligence",
    category: "Revenue Analytics & Decision Intelligence",
    summary:
      "A trusted analytics layer connecting customer journeys, funnel behavior, revenue events, AI-assisted engagement, and directional attribution to support informed commercial decisions.",
    fullDescription:
      "The Revenue Intelligence System is a trusted analytics layer connecting customer journeys, funnel behavior, revenue events, AI-assisted engagement, and directional attribution to support informed commercial decisions — with deliberate trust boundaries, deduplication, and diagnostics built in.",
    status: "Live",
    visibility: "public",
    featured: false,
    homepageFeatured: false,
    capabilities: [
      "Revenue-event tracking",
      "Funnel analytics",
      "Attribution controls",
      "Executive dashboards",
      "Revenue diagnostics",
    ],
    ctaLabel: "Request a Similar System",
    ctaRoute: CONSULT_ROUTE,
    workSection: "featured",
    filters: ["Analytics & Growth"],
    sortOrder: 7,
  },
  {
    id: "ai-business-automation",
    slug: "ai-business-automation",
    title: "AI Business Automation",
    shortTitle: "AI Automation",
    category: "AI Automation & Operational Intelligence",
    summary:
      "Custom AI-enabled workflows for lead qualification, content operations, customer engagement, business intelligence, follow-up systems, internal knowledge access, and executive decision support.",
    fullDescription:
      "Elevate360Official designs custom AI-enabled workflows for lead qualification, content operations, customer engagement, business intelligence, follow-up systems, internal knowledge access, and executive decision support — built as an ongoing capability rather than a one-off deliverable.",
    status: "Ongoing Capability",
    visibility: "public",
    featured: false,
    homepageFeatured: false,
    capabilities: [
      "Lead qualification",
      "Content operations",
      "Customer engagement",
      "Business intelligence",
      "Decision support",
    ],
    ctaLabel: "Explore AI Solutions",
    ctaRoute: CONSULT_ROUTE,
    workSection: "featured",
    filters: ["AI & Automation"],
    sortOrder: 8,
  },
];

export const CURRENT_INITIATIVES: CurrentInitiative[] = [
  {
    projectId: "project-nehemiah",
    phase: "Design",
    focus: "Shaping the ministry-focused information architecture and content structure with church leadership input.",
    nextMilestone: "Leadership review of the proposed platform design.",
    collaborationType: "In development",
    lastUpdatedLabel: "August 2026",
  },
  {
    projectId: "operation-ascend",
    phase: "Strategy",
    focus: "Exploring practical, responsible pathways for internal knowledge access and staff support.",
    nextMilestone: "Alignment on prioritized implementation pathways with organizational leadership.",
    collaborationType: "Collaboration",
    lastUpdatedLabel: "August 2026",
  },
  {
    projectId: "south-shore-ai",
    phase: "Strategy",
    focus: "Platform strategy, AI-tool evaluation, and responsible implementation guidance.",
    nextMilestone: "Continued advisory support for the initiative's public learning experience.",
    collaborationType: "Technical advisory",
    lastUpdatedLabel: "August 2026",
  },
  {
    projectId: "search-intelligence",
    phase: "Ongoing",
    focus: "Enhancing scheduled search operations, evidence-based growth actions, and measurement discipline.",
    nextMilestone: "Continued iteration on growth-operations capabilities.",
    collaborationType: "Internal product",
    lastUpdatedLabel: "August 2026",
  },
];

export const CONFIDENTIALITY_STATEMENT =
  "We respect client confidentiality. Public case studies include only approved information and exclude private documents, sensitive data, security findings, credentials, and internal operational details.";

// ── Public-boundary helpers ──────────────────────────────────────────────────

/** Everything renderable on public pages (confidential records excluded). */
export function getPublicProjects(): FlagshipProject[] {
  return FLAGSHIP_PROJECTS
    .filter((p) => p.visibility !== "confidential")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Homepage cards — homepageFeatured, public boundary applied, hard cap 6. */
export function getHomepageProjects(): FlagshipProject[] {
  return getPublicProjects().filter((p) => p.homepageFeatured).slice(0, 6);
}

export function getProjectsBySection(section: FlagshipProject["workSection"]): FlagshipProject[] {
  return getPublicProjects().filter((p) => p.workSection === section);
}

export function getCurrentInitiatives(): Array<CurrentInitiative & { project: FlagshipProject }> {
  const publicIds = new Map(getPublicProjects().map((p) => [p.id, p]));
  return CURRENT_INITIATIVES
    .map((i) => ({ ...i, project: publicIds.get(i.projectId)! }))
    .filter((i) => Boolean(i.project));
}
