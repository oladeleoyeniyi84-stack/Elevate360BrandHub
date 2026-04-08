export type ConciergeModeKey =
  | "default"
  | "brandStrategy"
  | "aiContent"
  | "creativeDirection"
  | "appProduct"
  | "collaboration";

export type ConciergeMode = {
  title: string;
  subtitle: string;
  intro: string;
  chip: string;
  placeholder: string;
};

export const conciergeModes: Record<ConciergeModeKey, ConciergeMode> = {
  default: {
    title: "Elevate360 Concierge",
    subtitle: "AI-powered • Founder-guided",
    intro:
      "Hi, I'm your Elevate360 Concierge. I can help you discover the right session, product, book, or next step — guided by the Elevate360 founder vision.",
    chip: "Always here",
    placeholder: "Ask me anything about Elevate360...",
  },
  brandStrategy: {
    title: "Brand Strategy Guide",
    subtitle: "Founder-guided strategic mode",
    intro:
      "Let's clarify your brand positioning, messaging, and growth roadmap so your next move is sharper and more profitable.",
    chip: "Strategic mode",
    placeholder: "Tell me about your brand goals...",
  },
  aiContent: {
    title: "AI Content Guide",
    subtitle: "Founder-guided content mode",
    intro:
      "Let's build a smarter content system using AI tools, workflow structure, and platform-specific growth strategy.",
    chip: "Creative mode",
    placeholder: "What kind of content do you want to create?",
  },
  creativeDirection: {
    title: "Creative Direction Guide",
    subtitle: "Founder-guided visual mode",
    intro:
      "Let's refine your visuals, campaigns, messaging, and premium brand edge so your presentation feels elevated.",
    chip: "Visual mode",
    placeholder: "What creative direction do you need help with?",
  },
  appProduct: {
    title: "Product Consultation Guide",
    subtitle: "Founder-guided product mode",
    intro:
      "Let's shape your app or digital product from concept to launch with better UX, monetization, and growth thinking.",
    chip: "Product mode",
    placeholder: "Tell me about your app or product idea...",
  },
  collaboration: {
    title: "Collaboration Guide",
    subtitle: "Founder-guided partnership mode",
    intro:
      "Let's explore partnerships, licensing, co-creation, or strategic collaboration opportunities that fit Elevate360.",
    chip: "Partnership mode",
    placeholder: "What kind of collaboration are you exploring?",
  },
};

export const SESSION_MODE_MAP: Record<string, ConciergeModeKey> = {
  "Brand Strategy Session": "brandStrategy",
  "AI Content Consultation": "aiContent",
  "Creative Direction Call": "creativeDirection",
  "App/Product Consultation": "appProduct",
  "App / Product Consultation": "appProduct",
  "Collaboration Discovery Call": "collaboration",
};
