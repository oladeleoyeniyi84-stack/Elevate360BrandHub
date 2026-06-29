import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles, Eye, EyeOff, Loader2, Copy, Check, AlertTriangle, Wand2, LayoutTemplate,
  Layers, RefreshCw, Save, History, Trash2, Bookmark,
  Download, Image as ImageIcon, Video as VideoIcon, Package as PackageIcon,
  Newspaper, ExternalLink, Send,
  Megaphone, FolderOpen, ArrowLeft, Gauge, Rocket, Lightbulb,
} from "lucide-react";

const GOLD = "#F4A62A";
const BG = "hsl(220 50% 8%)";

const CONTENT_TYPES = [
  { value: "social", label: "Social Post" },
  { value: "email", label: "Email" },
  { value: "blog", label: "Blog Draft" },
  { value: "summary", label: "Summary" },
  { value: "headline", label: "Headline" },
] as const;

type ContentType = (typeof CONTENT_TYPES)[number]["value"];

const PLATFORMS = [
  { value: "", label: "Auto / None" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "podcast", label: "Podcast" },
  { value: "email", label: "Email" },
  { value: "blog", label: "Blog" },
] as const;

type Platform = (typeof PLATFORMS)[number]["value"];

interface Template {
  name: string;
  type: ContentType;
  platform: Platform;
  temperature: number;
  prompt: string;
  system?: string;
}

// Elevate360-ready presets. Each prefills content type, platform, prompt/topic,
// optional system instruction, and a recommended temperature. The [brackets]
// are placeholders the founder edits before generating.
const TEMPLATES: Template[] = [
  {
    name: "Elevate360 Instagram Caption",
    type: "social",
    platform: "instagram",
    temperature: 0.8,
    prompt:
      "Write an Instagram caption announcing [topic]. Include a strong hook, 2-3 short value lines, a tasteful emoji or two, a clear call to action, and 5-8 relevant hashtags.",
    system: "Format for Instagram: a scroll-stopping first line, short readable lines, and a hashtag block at the end.",
  },
  {
    name: "Elevate360 LinkedIn Post",
    type: "social",
    platform: "linkedin",
    temperature: 0.6,
    prompt:
      "Write a LinkedIn post about [topic] for a professional audience. Share an insight or lesson, keep it credible and value-driven, and end with a thoughtful question or CTA.",
    system: "Format for LinkedIn: professional but human tone, short paragraphs, max 3 hashtags.",
  },
  {
    name: "Elevate360 X Post",
    type: "social",
    platform: "x",
    temperature: 0.8,
    prompt: "Write a concise, high-impact X post about [topic]. Then offer an optional 3-post thread version.",
    system: "Format for X: under 280 characters per post, punchy, no fluff.",
  },
  {
    name: "Elevate360 Facebook Post",
    type: "social",
    platform: "facebook",
    temperature: 0.7,
    prompt: "Write a Facebook post about [topic] that feels warm and community-driven, with a clear call to action.",
    system: "Format for Facebook: friendly, conversational, encourages comments and shares.",
  },
  {
    name: "Elevate360 Podcast Promo",
    type: "social",
    platform: "podcast",
    temperature: 0.75,
    prompt:
      "Write a promo for the latest Elevate360 podcast episode about [topic]. Tease the key takeaways and invite listeners to tune in.",
    system: "Promo copy: build curiosity, highlight 2-3 takeaways, and say where to listen.",
  },
  {
    name: "Elevate360 Book Promo",
    type: "social",
    platform: "instagram",
    temperature: 0.8,
    prompt:
      "Write promo copy for an Elevate360 book titled [book title] about [theme]. Highlight the transformation the reader gets and include a CTA to buy on Amazon.",
    system: "Promo copy: focus on reader benefit and transformation, premium tone, clear CTA.",
  },
  {
    name: "Elevate360 Blog Article",
    type: "blog",
    platform: "blog",
    temperature: 0.7,
    prompt:
      "Write a structured blog article about [topic] with an engaging intro, 3-5 sections with subheadings, practical takeaways, and a conclusion with a call to action.",
    system: "Format as a complete blog article with clear headings and scannable structure.",
  },
  {
    name: "Elevate360 Newsletter",
    type: "email",
    platform: "email",
    temperature: 0.6,
    prompt:
      "Write an Elevate360 email newsletter about [topic]. Include a subject line, a warm opening, the main update or value, and a clear CTA.",
    system: "Format as an email newsletter: include a subject line, friendly greeting, scannable body, and a single primary CTA.",
  },
  {
    name: "Elevate360 YouTube Description",
    type: "summary",
    platform: "youtube",
    temperature: 0.6,
    prompt:
      "Write a YouTube video description for a video about [topic]. Include a compelling summary, timestamp placeholders, a links section, relevant hashtags, and a subscribe CTA.",
    system: "Format as a YouTube description: 1-2 paragraph summary, suggested timestamps, links section, hashtags, subscribe CTA.",
  },
  {
    name: "Elevate360 Video Script",
    type: "blog",
    platform: "youtube",
    temperature: 0.7,
    prompt:
      "Write a short video script about [topic]. Include a hook, main talking points, and a closing call to action. Mark sections clearly.",
    system: "Format as a video script with [HOOK], [BODY], and [CTA] sections using spoken-style language.",
  },
  {
    name: "Strategy Session Promo",
    type: "email",
    platform: "email",
    temperature: 0.7,
    prompt:
      "Write promo copy inviting people to book an Elevate360 strategy session about [goal]. Emphasize the outcome they get and create gentle urgency.",
    system: "Promo copy: outcome-focused, premium and inviting, single clear CTA to book.",
  },
  {
    name: "AI Growth Playbook Promo",
    type: "social",
    platform: "linkedin",
    temperature: 0.7,
    prompt:
      "Write promo copy for the Elevate360 AI Growth Playbook, a resource that helps creators and founders grow with AI. Highlight what is inside and the result it delivers.",
    system: "Promo copy: highlight key benefits and outcomes, credible and motivating, clear CTA.",
  },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ----- localStorage-backed prompt library + generation history -----
const LIB_KEY = "e360_studio_prompt_library";
const HIST_KEY = "e360_studio_history";
const HIST_MAX = 50;

interface SavedPrompt {
  id: string;
  name: string;
  type: ContentType;
  platform: Platform;
  prompt: string;
  system: string;
  temperature: number;
  useBrandVoice: boolean;
  founderVoice: boolean;
}

interface HistoryEntry {
  id: string;
  at: number;
  type: ContentType;
  platform: Platform;
  prompt: string;
  system: string;
  temperature: number;
  useBrandVoice: boolean;
  founderVoice: boolean;
  content: string;
  model: string;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / serialization errors */
  }
}

const newId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const countWords = (s: string) => {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
};

const platformLabel = (value: string) => PLATFORMS.find((p) => p.value === value)?.label ?? "Auto / None";

// ----- Export & distribution helpers (Phase 72.7, fully client-side) -----

interface ExportSection {
  heading: string;
  body: string;
}

// System instructions for the auxiliary image/video prompt generators. These
// reuse the EXISTING DeepSeek endpoint (no backend change). Brand/founder voice
// are intentionally left off so the result is a clean, tool-ready prompt.
const IMAGE_PROMPT_SYSTEM =
  "You are an expert visual art director. Read the content provided and write ONE vivid, ready-to-use image-generation prompt (for tools like Midjourney or DALL·E) that visually captures its core theme and mood for the Elevate360 brand. Describe subject, setting, style, mood, lighting, composition, and color palette in a single rich paragraph. Output ONLY the image prompt — no preamble, labels, or quotation marks.";

const VIDEO_PROMPT_SYSTEM =
  "You are an expert video creative director. Read the content provided and write ONE concise, ready-to-use video-generation prompt (for tools like Runway, Sora, or Veo) that brings its core theme to life for the Elevate360 brand. Describe the scene, key shots, camera motion, pacing, mood, lighting, and overall style. Output ONLY the video prompt — no preamble, labels, or quotation marks.";

function fileBase(label: string) {
  const slug =
    label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "elevate360-content";
  return `${slug}-${new Date().toISOString().slice(0, 10)}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sectionsToText(title: string, sections: ExportSection[]) {
  const parts = [title, "=".repeat(title.length)];
  for (const s of sections) {
    parts.push("", s.heading, "-".repeat(s.heading.length), "", s.body);
  }
  return `${parts.join("\n")}\n`;
}

function exportTxt(base: string, title: string, sections: ExportSection[]) {
  downloadBlob(new Blob([sectionsToText(title, sections)], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
}

// docx + jspdf are dynamically imported so they only load when the founder
// actually exports — keeping them out of the initial bundle.
async function exportDocx(base: string, title: string, sections: ExportSection[]) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const children: InstanceType<typeof Paragraph>[] = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
  for (const s of sections) {
    children.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_2 }));
    for (const line of s.body.split("\n")) {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  downloadBlob(blob, `${base}.docx`);
}

async function exportPdf(base: string, title: string, sections: ExportSection[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;
  const writeBlock = (text: string, size: number, bold: boolean, gap: number) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    for (const line of doc.splitTextToSize(text || " ", maxWidth)) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size * 1.4;
    }
    y += gap;
  };
  writeBlock(title, 18, true, 12);
  for (const s of sections) {
    writeBlock(s.heading, 13, true, 4);
    writeBlock(s.body, 11, false, 12);
  }
  doc.save(`${base}.pdf`);
}

interface GenerateResponse {
  type: string;
  model: string;
  maxTokens: number;
  latencyMs: number;
  content: string;
}

interface GenBody {
  type: ContentType;
  prompt: string;
  system?: string;
  temperature?: number;
  platform?: string;
  useBrandVoice: boolean;
  founderVoice: boolean;
}

// Calls the founder-only, PIN-gated endpoint. Credentials are sent so the
// dashboard session cookie authenticates the request. The DeepSeek API key
// lives only on the server — it is never referenced or exposed client-side.
async function generateContent(body: GenBody): Promise<GenerateResponse> {
  const res = await fetch("/api/ai/content", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    sessionStorage.removeItem("e360_dashboard_auth");
    window.location.reload();
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string })?.message ?? `Request failed (${res.status})`);
  }
  return data as GenerateResponse;
}

// Builds the request body for image/video prompt generation. Reuses the
// "summary" budget on the existing endpoint; brand/founder voice off for a
// clean, tool-ready prompt.
const promptGenBody = (content: string, instruction: string): GenBody => ({
  type: "summary",
  prompt: `${content}\n\n---\nUsing the content above, produce the requested prompt now.`,
  system: instruction,
  temperature: 0.7,
  useBrandVoice: false,
  founderVoice: false,
});

// ----- Blog publishing (reuses the existing PIN-gated /api/dashboard/posts) -----
const BLOG_DEFAULT_CATEGORY = "AI & Business Growth";

interface BlogDraftForm {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  body: string;
}

interface BlogPostResult {
  id: number;
  slug: string;
  title: string;
  published: boolean;
}

// Title = first non-empty line, stripped of markdown heading/bold/list marks.
function deriveBlogTitle(content: string): string {
  for (const raw of content.split(/\r?\n/)) {
    const line = raw
      .replace(/^#{1,6}\s*/, "")
      .replace(/^[>*+\-]\s*/, "")
      .replace(/\*\*|__|`/g, "")
      .trim();
    if (line) return line.slice(0, 120);
  }
  return "Untitled Post";
}

// Excerpt = first paragraph that isn't the title, stripped + truncated.
function deriveBlogExcerpt(content: string, title: string): string {
  const blocks = content
    .split(/\r?\n\s*\r?\n/)
    .map((b) =>
      b.replace(/^#{1,6}\s*/, "").replace(/\*\*|__|`/g, "").replace(/\s+/g, " ").trim(),
    )
    .filter(Boolean);
  for (const b of blocks) {
    if (b.toLowerCase() === title.toLowerCase()) continue;
    return b.slice(0, 280);
  }
  return (blocks[0] ?? title).slice(0, 280);
}

// Shared fetch for the PIN-gated dashboard blog API. Sends the session cookie
// and mirrors generateContent's 401 handling. No secrets are read client-side.
async function dashJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (res.status === 401) {
    sessionStorage.removeItem("e360_dashboard_auth");
    window.location.reload();
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? data?.message ?? `Request failed (${res.status})`);
  }
  return data;
}

async function fetchBlogSlugs(): Promise<Set<string>> {
  const posts = (await dashJson("/api/dashboard/posts")) as Array<{ slug: string }>;
  return new Set((posts ?? []).map((p) => p.slug));
}

// Appends -1, -2, … until the slug is free (server enforces a UNIQUE slug).
function ensureUniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "post";
  if (!taken.has(root)) return root;
  let n = 1;
  while (n < 1000 && taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

async function createBlogDraftPost(form: BlogDraftForm): Promise<BlogPostResult> {
  return dashJson("/api/dashboard/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: form.title.trim().slice(0, 300),
      slug: form.slug,
      excerpt: form.excerpt.trim().slice(0, 500),
      body: form.body,
      category: (form.category.trim() || BLOG_DEFAULT_CATEGORY).slice(0, 60),
    }),
  }) as Promise<BlogPostResult>;
}

async function publishBlogPost(id: number): Promise<BlogPostResult> {
  return dashJson(`/api/dashboard/posts/${id}/publish`, { method: "PATCH" }) as Promise<BlogPostResult>;
}

// ===== Phase 72 — Content Distribution Engine (Campaigns) =====
// Campaign persistence lives behind the PIN-gated /api/admin/campaigns router.
// Content generation reuses the existing /api/ai/content endpoint via
// generateContent() above — there is no separate AI surface for campaigns.

const CAMPAIGN_ASSET_KEYS = [
  "blog", "linkedin", "facebook", "instagram", "x", "newsletter",
  "email", "podcast", "youtube", "imagePrompt", "videoPrompt", "seo",
] as const;
type CampaignAssetKey = (typeof CAMPAIGN_ASSET_KEYS)[number];

interface CampaignRow {
  id: number;
  title: string;
  source: string;
  blogPostId: number | null;
  blogSlug: string | null;
  topic: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
interface CampaignAssetRow {
  id: number;
  campaignId: number;
  assetKey: string;
  content: string;
  status: string;
  updatedAt: string;
}
interface CampaignDetailData extends CampaignRow {
  assets: CampaignAssetRow[];
}

const ASSET_META: Record<CampaignAssetKey, { label: string; ext: string; file: string }> = {
  blog: { label: "Blog Post", ext: "md", file: "blog-post" },
  linkedin: { label: "LinkedIn", ext: "txt", file: "linkedin" },
  facebook: { label: "Facebook", ext: "txt", file: "facebook" },
  instagram: { label: "Instagram", ext: "txt", file: "instagram" },
  x: { label: "X / Twitter", ext: "txt", file: "x-twitter" },
  newsletter: { label: "Newsletter", ext: "txt", file: "newsletter" },
  email: { label: "Marketing Email", ext: "txt", file: "email" },
  podcast: { label: "Podcast Script", ext: "txt", file: "podcast-script" },
  youtube: { label: "YouTube", ext: "txt", file: "youtube" },
  imagePrompt: { label: "Image Prompt", ext: "txt", file: "image-prompt" },
  videoPrompt: { label: "Video Prompt", ext: "txt", file: "video-prompt" },
  seo: { label: "SEO Pack", ext: "txt", file: "seo-pack" },
};

// Maps each campaign asset onto the existing /api/ai/content contract
// (type: headline | social | summary | email | blog). The published blog is the
// single source the other 11 assets are repurposed from.
function assetGenBody(key: CampaignAssetKey, topic: string, blog: string): GenBody {
  const src = blog.trim();
  const repurpose = (task: string): GenBody => ({
    type: "summary",
    prompt: `${task}\n\n--- SOURCE BLOG CONTENT ---\n${src}`,
    useBrandVoice: true,
    founderVoice: false,
    temperature: 0.7,
  });
  switch (key) {
    case "blog":
      return {
        type: "blog",
        prompt: `Write a complete, well-structured, on-brand Elevate360 blog post about: ${topic || "the subject of the reference content below"}.\n\n--- REFERENCE ---\n${src}`,
        system: "You are Elevate360's content writer. Use a clear intro hook, well-organized headed sections, and a closing call to action.",
        useBrandVoice: true,
        founderVoice: false,
        temperature: 0.7,
      };
    case "linkedin":
      return { ...repurpose("Repurpose the source blog into a professional LinkedIn post. Strong first-line hook, 3-5 short insight lines, a reflective question, and 3-5 relevant hashtags."), type: "social", platform: "linkedin" };
    case "facebook":
      return { ...repurpose("Repurpose the source blog into a warm, community-oriented Facebook post. Conversational tone, clear value, a friendly call to action, and 2-3 hashtags."), type: "social", platform: "facebook", temperature: 0.8 };
    case "instagram":
      return { ...repurpose("Repurpose the source blog into an Instagram caption. Scroll-stopping first line, short readable value lines, 1-2 tasteful emojis, a clear call to action, and 5-8 relevant hashtags."), type: "social", platform: "instagram", temperature: 0.85 };
    case "x":
      return { ...repurpose("Repurpose the source blog into an X (Twitter) thread of 4-6 posts. Number each (1/, 2/ …). First post is a strong hook; final post has a call to action."), type: "social", platform: "x", temperature: 0.8 };
    case "newsletter":
      return { ...repurpose("Repurpose the source blog into an email newsletter edition. Include a subject line, a preheader, a personable intro, scannable key-takeaway sections, and a closing call to action."), type: "email", platform: "email" };
    case "email":
      return { ...repurpose("Repurpose the source blog into a concise marketing email. Include a subject line, a compelling opener, 2-3 benefit-driven paragraphs, and one clear call-to-action line."), type: "email", platform: "email" };
    case "podcast":
      return repurpose("Repurpose the source blog into a podcast episode script: a cold-open hook, a host intro, 3-4 talking-point segments in natural spoken phrasing, and an outro with a call to action.");
    case "youtube":
      return repurpose("Repurpose the source blog into a YouTube package: 3 title options, a 150-200 word description with timestamp placeholders, 8-12 tags, and a short spoken intro script.");
    case "imagePrompt":
      return { ...repurpose("Write a single, detailed, tool-ready image-generation prompt (Midjourney/DALL-E style) that visually represents the source blog. One paragraph covering subject, style, mood, lighting, composition, and color. Output only the prompt."), useBrandVoice: false };
    case "videoPrompt":
      return { ...repurpose("Write a single, detailed, tool-ready video-generation prompt (Sora/Runway style) for the source blog. Cover scene, motion, camera, mood, pacing, and color. Output only the prompt."), useBrandVoice: false };
    case "seo":
      return { ...repurpose("Produce an SEO metadata pack for the source blog. Label each section: SEO Title (<=60 chars), Meta Description (<=155 chars), Focus Keywords (8-12, comma-separated), URL Slug Suggestions (3), Internal Link Anchors (5)."), useBrandVoice: false };
  }
}

async function apiListCampaigns(): Promise<CampaignRow[]> {
  return dashJson("/api/admin/campaigns") as Promise<CampaignRow[]>;
}
async function apiGetCampaign(id: number): Promise<CampaignDetailData> {
  return dashJson(`/api/admin/campaigns/${id}`) as Promise<CampaignDetailData>;
}
async function apiCreateCampaign(input: {
  title: string; blogPostId?: number; blogSlug?: string; topic?: string; blogContent?: string;
}): Promise<CampaignDetailData> {
  return dashJson("/api/admin/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }) as Promise<CampaignDetailData>;
}
async function apiUpdateAsset(
  id: number, key: CampaignAssetKey, content: string, status?: "generated" | "edited",
): Promise<CampaignAssetRow> {
  return dashJson(`/api/admin/campaigns/${id}/assets/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, status }),
  }) as Promise<CampaignAssetRow>;
}
async function apiDeleteCampaign(id: number): Promise<void> {
  await dashJson(`/api/admin/campaigns/${id}`, { method: "DELETE" });
}

// ----- Deterministic, client-side scoring (no AI) -----
const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const wordCount = (s: string) => (s.trim().match(/\S+/g) ?? []).length;
const CTA_RE = /\b(learn more|get started|sign ?up|subscribe|download|contact|book|join|shop|buy|order|visit|discover|explore|register|claim|today|right now|click|dm|comment|share|follow|link in bio)\b/i;
const BRAND_RE = /\b(elevate ?360|elevate the world|one product at a time)\b/i;
const HEADING_RE = /(^|\n)\s*(#{1,3}\s|\d+\.\s|[-*]\s)/;

interface CampaignScore {
  seo: number; brandVoice: number; readability: number; cta: number; conversion: number; overall: number;
}
function scoreCampaign(get: (k: CampaignAssetKey) => string): CampaignScore {
  const blog = get("blog");
  const blogWords = wordCount(blog);
  const all = CAMPAIGN_ASSET_KEYS.map(get);
  const generated = all.filter((c) => c.trim().length > 0).length;
  const coverage = generated / CAMPAIGN_ASSET_KEYS.length;

  const seoText = get("seo");
  let seo = 0;
  seo += seoText.trim() ? 40 : 0;
  seo += /keyword/i.test(seoText) ? 12 : 0;
  seo += /description/i.test(seoText) ? 10 : 0;
  seo += blogWords >= 600 ? 25 : blogWords >= 300 ? 15 : blogWords > 0 ? 8 : 0;
  seo += HEADING_RE.test(blog) ? 13 : 0;

  const brandHits = all.filter((c) => BRAND_RE.test(c)).length;
  const brandVoice = clampScore(30 + brandHits * 11 + (BRAND_RE.test(blog) ? 15 : 0));

  let readability = 55;
  if (blogWords > 0) {
    const sentences = (blog.match(/[.!?]+/g) ?? []).length || 1;
    const avg = blogWords / sentences;
    readability = clampScore(100 - Math.abs(avg - 16) * 4);
  }

  const ctaAssets: CampaignAssetKey[] = ["linkedin", "facebook", "instagram", "x", "newsletter", "email", "youtube"];
  const present = ctaAssets.filter((k) => get(k).trim().length > 0);
  const ctaHits = present.filter((k) => CTA_RE.test(get(k))).length;
  const cta = clampScore((ctaHits / (present.length || 1)) * 100);

  const hasEmail = get("email").trim().length > 0 || get("newsletter").trim().length > 0;
  const conversion = clampScore(coverage * 50 + cta * 0.3 + (hasEmail ? 20 : 0));

  const overall = clampScore(seo * 0.25 + brandVoice * 0.2 + readability * 0.2 + cta * 0.15 + conversion * 0.2);
  return { seo: clampScore(seo), brandVoice, readability, cta, conversion, overall };
}

interface MissionRec { kind: "good" | "warn"; text: string; }
function missionControl(title: string, body: string, excerpt: string): MissionRec[] {
  const words = wordCount(body);
  const recs: MissionRec[] = [];
  recs.push(words >= 600
    ? { kind: "good", text: `Strong length — ${words} words is solid for SEO.` }
    : { kind: "warn", text: `Only ${words} words. Aim for 600+ to rank better in search.` });
  recs.push(HEADING_RE.test(body)
    ? { kind: "good", text: "Headings or lists detected — good structure." }
    : { kind: "warn", text: "Add section headings or lists to improve structure and SEO." });
  recs.push(CTA_RE.test(body)
    ? { kind: "good", text: "A call-to-action is present." }
    : { kind: "warn", text: "No clear call-to-action found — add one to drive conversions." });
  recs.push(title.trim().length > 0 && title.length <= 60
    ? { kind: "good", text: `Title length (${title.length}) is search-friendly.` }
    : { kind: "warn", text: `Keep the title under 60 characters for clean search snippets (now ${title.length}).` });
  recs.push(BRAND_RE.test(body)
    ? { kind: "good", text: "On-brand: Elevate360 voice detected." }
    : { kind: "warn", text: "Mention the Elevate360 brand to reinforce voice." });
  recs.push(excerpt.trim().length >= 50
    ? { kind: "good", text: "Excerpt is a good length for previews and meta description." }
    : { kind: "warn", text: "Write a 50-160 character excerpt — it doubles as your meta description." });
  return recs;
}

function Toggle({
  checked, onChange, label, testId,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; testId: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[#F4A62A]" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </span>
      <span className="text-white/80 text-sm">{label}</span>
    </button>
  );
}

function PinGate({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/dashboard/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      sessionStorage.setItem("e360_dashboard_auth", "true");
      onAuth();
    } else {
      setError("Invalid PIN.");
      setPin("");
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: GOLD }}>
            <Sparkles className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">AI Content Studio</h1>
          <p className="text-white/50 text-sm mt-1">Elevate360Official · Founder only</p>
        </div>
        <form onSubmit={submit} className="lux-card space-y-4">
          <div className="relative">
            <input
              data-testid="input-studio-pin"
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              autoComplete="current-password"
              autoFocus
              required
              className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 pr-12"
            />
            <button
              type="button"
              data-testid="button-toggle-pin-visibility"
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p data-testid="text-studio-login-error" className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" data-testid="button-studio-login" className="btn-primary w-full py-3">
            Access Content Studio
          </button>
        </form>
      </div>
    </div>
  );
}

function ExportButtons({
  idPrefix, onExport, disabled,
}: { idPrefix: string; onExport: (fmt: "txt" | "docx" | "pdf") => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {(["txt", "docx", "pdf"] as const).map((f) => (
        <button
          key={f}
          type="button"
          data-testid={`button-${idPrefix}-${f}`}
          onClick={() => onExport(f)}
          disabled={disabled}
          className="btn-secondary text-[10px] uppercase tracking-wide px-2 py-1 disabled:opacity-40"
        >
          {f}
        </button>
      ))}
    </div>
  );
}

function PackageSection({
  title, testId, value, loading, copiedKey, onCopy,
}: {
  title: string;
  testId: string;
  value: string;
  loading: boolean;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const key = `pkg-${testId}`;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex flex-col" data-testid={`package-${testId}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white/70 font-semibold text-[11px] uppercase tracking-wide">{title}</h3>
        {value && !loading && (
          <button
            type="button"
            data-testid={`button-copy-package-${testId}`}
            onClick={() => onCopy(value, key)}
            className="text-white/40 hover:text-white/80"
            aria-label={`Copy ${title}`}
          >
            {copiedKey === key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-xs py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-[#F4A62A]" /> Generating…
        </div>
      ) : value ? (
        <pre
          data-testid={`text-package-${testId}`}
          className="whitespace-pre-wrap break-words text-white/85 text-xs leading-relaxed font-sans overflow-auto max-h-60"
        >
          {value}
        </pre>
      ) : (
        <p className="text-white/30 text-xs py-6 text-center">Not generated yet.</p>
      )}
    </div>
  );
}

function Studio({ onOpenCampaign }: { onOpenCampaign?: (id: number) => void }) {
  const [type, setType] = useState<ContentType>("social");
  const [platform, setPlatform] = useState<Platform>("");
  const [prompt, setPrompt] = useState("");
  const [system, setSystem] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [useBrandVoice, setUseBrandVoice] = useState(true);
  const [founderVoice, setFounderVoice] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [saveName, setSaveName] = useState("");
  const [lastRun, setLastRun] = useState<{ count: number; body: GenBody } | null>(null);
  const [pkg, setPkg] = useState<{ content: string; imagePrompt: string; videoPrompt: string }>({
    content: "", imagePrompt: "", videoPrompt: "",
  });
  const [pkgOpen, setPkgOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [vidLoading, setVidLoading] = useState(false);
  const [pkgError, setPkgError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [blogOpen, setBlogOpen] = useState(false);
  const [blogForm, setBlogForm] = useState<BlogDraftForm>({
    title: "", slug: "", excerpt: "", category: BLOG_DEFAULT_CATEGORY, body: "",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [blogPublishing, setBlogPublishing] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [blogPublished, setBlogPublished] = useState<
    { slug: string; title: string; published: boolean } | null
  >(null);
  const [campaignCreating, setCampaignCreating] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);
  const [campaignWarn, setCampaignWarn] = useState<string | null>(null);

  const [promptLibrary, setPromptLibrary] = useState<SavedPrompt[]>(() => loadJson<SavedPrompt[]>(LIB_KEY, []));
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadJson<HistoryEntry[]>(HIST_KEY, []));

  const mutation = useMutation({
    mutationFn: async ({ count, body }: { count: number; body: GenBody }): Promise<GenerateResponse[]> => {
      const n = Math.max(1, count);
      const settled = await Promise.allSettled(Array.from({ length: n }, () => generateContent(body)));
      const ok = settled
        .filter((s): s is PromiseFulfilledResult<GenerateResponse> => s.status === "fulfilled")
        .map((s) => s.value);
      if (ok.length === 0) {
        const rejected = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
        throw rejected?.reason ?? new Error("Generation failed.");
      }
      return ok;
    },
    onSuccess: (data, variables) => {
      setCopiedIndex(null);
      const entries: HistoryEntry[] = data.map((r) => ({
        id: newId(),
        at: Date.now(),
        type: variables.body.type,
        platform: (variables.body.platform ?? "") as Platform,
        prompt: variables.body.prompt,
        system: variables.body.system ?? "",
        temperature: variables.body.temperature ?? 0.7,
        useBrandVoice: variables.body.useBrandVoice,
        founderVoice: variables.body.founderVoice,
        content: r.content,
        model: r.model,
      }));
      setHistory((prev) => {
        const next = [...entries, ...prev].slice(0, HIST_MAX);
        saveJson(HIST_KEY, next);
        return next;
      });
    },
  });

  const results = mutation.data ?? [];
  const canSubmit = prompt.trim().length > 0 && !mutation.isPending;

  const buildBody = (): GenBody => ({
    type,
    prompt: prompt.trim(),
    system: system.trim() || undefined,
    temperature,
    platform: platform || undefined,
    useBrandVoice,
    founderVoice,
  });

  const run = (count: number) => {
    if (prompt.trim().length === 0 || mutation.isPending) return;
    const payload = { count, body: buildBody() };
    setLastRun(payload);
    mutation.mutate(payload);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(1);
  };

  const regenerate = () => {
    if (!lastRun || mutation.isPending) return;
    mutation.mutate(lastRun);
  };

  const copyOutput = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 2000);
    } catch {
      setCopiedIndex(null);
    }
  };

  const flashCopied = (key: string) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 2000);
  };

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopied(key);
    } catch {
      /* clipboard unavailable */
    }
  };

  const variationSections = (): ExportSection[] =>
    results.map((r, i) => ({ heading: results.length > 1 ? `Variation ${i + 1}` : "Content", body: r.content }));

  const copyAllVariations = () => {
    if (results.length === 0) return;
    const text = results
      .map((r, i) => `${results.length > 1 ? `Variation ${i + 1}` : "Content"}\n\n${r.content}`)
      .join("\n\n----------\n\n");
    void copyText(text, "all");
  };

  // Guards the async docx/pdf export so a failure never escapes as an unhandled
  // rejection and the busy flag always clears.
  const withExport = async (fn: () => void | Promise<void>) => {
    setExportBusy(true);
    try {
      await fn();
    } catch {
      /* export generation failed — leave UI usable */
    } finally {
      setExportBusy(false);
    }
  };

  const runExport = (fmt: "txt" | "docx" | "pdf", base: string, title: string, sections: ExportSection[]) =>
    void withExport(() =>
      fmt === "txt"
        ? exportTxt(base, title, sections)
        : fmt === "docx"
          ? exportDocx(base, title, sections)
          : exportPdf(base, title, sections),
    );

  const exportAll = (fmt: "txt" | "docx" | "pdf") => {
    if (results.length === 0) return;
    runExport(fmt, fileBase(lastRun?.body.prompt ?? prompt ?? "elevate360-content"), "Elevate360 Content", variationSections());
  };

  const exportVariation = (content: string, index: number, fmt: "txt" | "docx" | "pdf") => {
    const title = results.length > 1 ? `Elevate360 Content — Variation ${index + 1}` : "Elevate360 Content";
    runExport(fmt, fileBase(`${lastRun?.body.prompt ?? prompt}-v${index + 1}`), title, [{ heading: "Content", body: content }]);
  };

  const genImagePrompt = async (content: string) => {
    setPkgOpen(true);
    setPkg((p) => ({ ...p, content }));
    setPkgError(null);
    setImgLoading(true);
    try {
      const r = await generateContent(promptGenBody(content, IMAGE_PROMPT_SYSTEM));
      setPkg((p) => ({ ...p, content, imagePrompt: r.content }));
    } catch (e) {
      setPkgError((e as Error)?.message ?? "Failed to generate image prompt.");
    } finally {
      setImgLoading(false);
    }
  };

  const genVideoPrompt = async (content: string) => {
    setPkgOpen(true);
    setPkg((p) => ({ ...p, content }));
    setPkgError(null);
    setVidLoading(true);
    try {
      const r = await generateContent(promptGenBody(content, VIDEO_PROMPT_SYSTEM));
      setPkg((p) => ({ ...p, content, videoPrompt: r.content }));
    } catch (e) {
      setPkgError((e as Error)?.message ?? "Failed to generate video prompt.");
    } finally {
      setVidLoading(false);
    }
  };

  // Content Package = the source content + an image prompt + a video prompt.
  // Both prompts are generated in parallel via the existing DeepSeek endpoint.
  const genPackage = async (content: string) => {
    setPkgOpen(true);
    setPkg({ content, imagePrompt: "", videoPrompt: "" });
    setPkgError(null);
    setImgLoading(true);
    setVidLoading(true);
    const [img, vid] = await Promise.allSettled([
      generateContent(promptGenBody(content, IMAGE_PROMPT_SYSTEM)),
      generateContent(promptGenBody(content, VIDEO_PROMPT_SYSTEM)),
    ]);
    setImgLoading(false);
    setVidLoading(false);
    setPkg({
      content,
      imagePrompt: img.status === "fulfilled" ? img.value.content : "",
      videoPrompt: vid.status === "fulfilled" ? vid.value.content : "",
    });
    if (img.status === "rejected" && vid.status === "rejected") {
      setPkgError("Failed to generate the content package. Please try again.");
    }
  };

  const packageSections = (): ExportSection[] => {
    const s: ExportSection[] = [];
    if (pkg.content) s.push({ heading: "Content", body: pkg.content });
    if (pkg.imagePrompt) s.push({ heading: "Image Prompt", body: pkg.imagePrompt });
    if (pkg.videoPrompt) s.push({ heading: "Video Prompt", body: pkg.videoPrompt });
    return s;
  };

  const exportPackage = (fmt: "txt" | "docx" | "pdf") => {
    const sections = packageSections();
    if (sections.length === 0) return;
    runExport(fmt, fileBase("content-package"), "Elevate360 Content Package", sections);
  };

  const openBlogReview = (content: string) => {
    const title = deriveBlogTitle(content);
    setBlogForm({
      title,
      slug: slugify(title),
      excerpt: deriveBlogExcerpt(content, title),
      category: BLOG_DEFAULT_CATEGORY,
      body: content,
    });
    setSlugEdited(false);
    setBlogError(null);
    setBlogPublished(null);
    setCampaignCreating(false);
    setCreatedCampaignId(null);
    setCampaignWarn(null);
    setBlogOpen(true);
  };

  const onBlogTitleChange = (v: string) => {
    setBlogForm((f) => ({ ...f, title: v, slug: slugEdited ? f.slug : slugify(v) }));
  };

  const onBlogSlugChange = (v: string) => {
    setSlugEdited(true);
    setBlogForm((f) => ({ ...f, slug: slugify(v) }));
  };

  // Reuses the existing PIN-gated endpoints: create (published=false) then,
  // when publishing, PATCH /publish to toggle it live. Slug collisions are
  // resolved client-side by suffixing before the create call.
  const saveOrPublishBlog = async (publish: boolean) => {
    const title = blogForm.title.trim();
    if (!title) { setBlogError("A title is required."); return; }
    if (!blogForm.body.trim()) { setBlogError("There is no content to publish."); return; }
    setBlogPublishing(true);
    setBlogError(null);
    try {
      const taken = await fetchBlogSlugs();
      // Cap the base under the 200-char schema limit so suffixes can't overflow.
      const baseSlug =
        (slugify(blogForm.slug) || slugify(title) || "post").slice(0, 180).replace(/-+$/, "") || "post";
      const slug = ensureUniqueSlug(baseSlug, taken);
      const payload: BlogDraftForm = {
        ...blogForm,
        title,
        excerpt: blogForm.excerpt.trim() || title,
        slug,
      };
      let created: BlogPostResult;
      try {
        created = await createBlogDraftPost(payload);
      } catch (firstErr) {
        // A concurrent insert may have claimed the slug. Recompute against fresh
        // slugs and retry once; if the slug is unchanged the failure was not a
        // collision, so surface the original error rather than masking it.
        const fresh = await fetchBlogSlugs();
        const retrySlug = ensureUniqueSlug(baseSlug, fresh);
        if (retrySlug === slug) throw firstErr;
        created = await createBlogDraftPost({ ...payload, slug: retrySlug });
      }
      const finalPost = publish ? await publishBlogPost(created.id) : created;
      setBlogPublished({ slug: finalPost.slug, title: finalPost.title, published: finalPost.published });
      // Phase 72: after a successful PUBLISH, auto-create a Campaign from the
      // live post. Non-blocking — a failure never affects the publish result.
      if (publish && finalPost.published) {
        setCampaignWarn(null);
        setCreatedCampaignId(null);
        setCampaignCreating(true);
        apiCreateCampaign({
          title: finalPost.title,
          blogPostId: finalPost.id,
          blogSlug: finalPost.slug,
          topic: finalPost.title,
          blogContent: payload.body,
        })
          .then((c) => setCreatedCampaignId(c.id))
          .catch(() => setCampaignWarn("Couldn’t auto-create the campaign — open the Campaigns tab to retry."))
          .finally(() => setCampaignCreating(false));
      }
    } catch (e) {
      setBlogError((e as Error)?.message ?? "Could not save the post. Please try again.");
    } finally {
      setBlogPublishing(false);
    }
  };

  const savePrompt = () => {
    if (prompt.trim().length === 0) return;
    const name = saveName.trim() || prompt.trim().slice(0, 50) || "Untitled prompt";
    const entry: SavedPrompt = {
      id: newId(),
      name,
      type,
      platform,
      prompt: prompt.trim(),
      system: system.trim(),
      temperature,
      useBrandVoice,
      founderVoice,
    };
    setPromptLibrary((prev) => {
      const next = [entry, ...prev];
      saveJson(LIB_KEY, next);
      return next;
    });
    setSaveName("");
  };

  const applySettings = (s: {
    type: ContentType; platform: Platform; prompt: string; system: string;
    temperature: number; useBrandVoice: boolean; founderVoice: boolean;
  }) => {
    setType(s.type);
    setPlatform(s.platform);
    setPrompt(s.prompt);
    setSystem(s.system);
    setTemperature(s.temperature);
    setUseBrandVoice(s.useBrandVoice);
    setFounderVoice(s.founderVoice);
  };

  const deletePrompt = (id: string) => {
    setPromptLibrary((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveJson(LIB_KEY, next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveJson(HIST_KEY, []);
  };

  const applyTemplate = (t: Template) => {
    applySettings({
      type: t.type,
      platform: t.platform,
      prompt: t.prompt,
      system: t.system ?? "",
      temperature: t.temperature,
      useBrandVoice,
      founderVoice,
    });
    mutation.reset();
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
            <Sparkles className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Content Studio</h1>
            <p className="text-white/50 text-xs">Generate on-brand copy for any channel</p>
          </div>
        </header>
        <p data-testid="text-deepseek-note" className="text-white/40 text-xs mb-6">
          Powered by DeepSeek for cost-efficient content generation.
        </p>

        {/* Template library */}
        <div className="lux-card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <LayoutTemplate className="h-4 w-4 text-[#F4A62A]" />
            <h2 className="text-white font-semibold text-sm">Templates</h2>
            <span className="text-white/40 text-xs">— one click to prefill</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                data-testid={`button-template-${slugify(t.name)}`}
                onClick={() => applyTemplate(t)}
                className="btn-secondary text-xs px-3 py-2 text-left leading-snug"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input panel */}
          <form onSubmit={submit} className="lux-card space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="select-content-type" className="block text-white/70 text-xs uppercase tracking-wide mb-2">
                  Content type
                </label>
                <select
                  id="select-content-type"
                  data-testid="select-content-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ContentType)}
                  className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F4A62A]/50"
                >
                  {CONTENT_TYPES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#0b1220] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="select-platform" className="block text-white/70 text-xs uppercase tracking-wide mb-2">
                  Platform
                </label>
                <select
                  id="select-platform"
                  data-testid="select-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F4A62A]/50"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value || "none"} value={p.value} className="bg-[#0b1220] text-white">
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="input-prompt" className="block text-white/70 text-xs uppercase tracking-wide mb-2">
                Prompt / topic
              </label>
              <textarea
                id="input-prompt"
                data-testid="input-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What should this content be about? Be specific about audience, tone, and goal."
                rows={6}
                className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 resize-y"
              />
              <div className="flex justify-end mt-1">
                <span data-testid="text-prompt-count" className="text-white/30 text-[10px] tabular-nums">
                  {countWords(prompt)} words · {prompt.length} chars
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="input-system" className="block text-white/70 text-xs uppercase tracking-wide mb-2">
                System instruction <span className="text-white/30 normal-case">(optional)</span>
              </label>
              <textarea
                id="input-system"
                data-testid="input-system"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder="Add custom guidance for this generation. It layers on top of the brand and founder voice."
                rows={3}
                className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 resize-y"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <Toggle
                checked={useBrandVoice}
                onChange={setUseBrandVoice}
                label="Use Elevate360 Brand Voice"
                testId="toggle-brand-voice"
              />
              <Toggle
                checked={founderVoice}
                onChange={setFounderVoice}
                label="Use Oladele Founder Voice"
                testId="toggle-founder-voice"
              />
              <p data-testid="text-founder-voice-note" className="text-white/40 text-xs">
                Founder Voice adds Oladele's warm, purpose-driven Elevate360 style.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="input-temperature" className="text-white/70 text-xs uppercase tracking-wide">
                  Temperature
                </label>
                <span data-testid="text-temperature-value" className="text-[#F4A62A] text-sm font-bold tabular-nums">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                id="input-temperature"
                data-testid="input-temperature"
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-[#F4A62A]"
              />
              <div className="flex justify-between text-white/30 text-[10px] mt-1">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="submit"
                data-testid="button-generate"
                disabled={!canSubmit}
                className="btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" /> Generate
                  </>
                )}
              </button>
              <button
                type="button"
                data-testid="button-generate-variations"
                onClick={() => run(3)}
                disabled={!canSubmit}
                className="btn-secondary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Layers className="h-4 w-4" /> 3 variations
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <input
                data-testid="input-save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Name this prompt (optional)"
                className="flex-1 bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50"
              />
              <button
                type="button"
                data-testid="button-save-prompt"
                onClick={savePrompt}
                disabled={prompt.trim().length === 0}
                className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5 disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </form>

          {/* Output panel */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-white font-semibold text-sm">
                Generated content{results.length > 1 ? ` · ${results.length} variations` : ""}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {results.length > 0 && (
                  <>
                    <button
                      type="button"
                      data-testid="button-copy-all"
                      onClick={copyAllVariations}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      {copiedKey === "all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedKey === "all" ? "Copied" : "Copy all"}
                    </button>
                    <div className="flex items-center gap-1.5" data-testid="group-download-all">
                      <span className="text-white/40 text-[10px] flex items-center gap-1">
                        <Download className="h-3 w-3" /> All
                      </span>
                      <ExportButtons idPrefix="download-all" onExport={exportAll} disabled={exportBusy} />
                    </div>
                  </>
                )}
                <button
                  type="button"
                  data-testid="button-regenerate"
                  onClick={regenerate}
                  disabled={!lastRun || mutation.isPending}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${mutation.isPending ? "animate-spin" : ""}`} /> Regenerate
                </button>
              </div>
            </div>

            {mutation.isPending && (
              <div data-testid="status-loading" className="lux-card flex flex-col items-center justify-center text-white/50 py-16 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-[#F4A62A]" />
                <p className="text-sm">
                  Generating {lastRun && lastRun.count > 1 ? `${lastRun.count} variations` : `your ${type}`}…
                </p>
              </div>
            )}

            {mutation.isError && !mutation.isPending && (
              <div data-testid="status-error" className="lux-card flex flex-col items-center justify-center py-16 gap-3 text-center">
                <AlertTriangle className="h-7 w-7 text-red-400" />
                <p className="text-red-400 text-sm max-w-xs">
                  {(mutation.error as Error)?.message ?? "Something went wrong. Please try again."}
                </p>
              </div>
            )}

            {!mutation.isPending && !mutation.isError && results.length > 0 &&
              results.map((r, i) => (
                <div key={i} className="lux-card flex flex-col" data-testid={`card-output-${i}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white/70 font-semibold text-xs uppercase tracking-wide">
                      {results.length > 1 ? `Variation ${i + 1}` : "Result"}
                    </h3>
                    <button
                      type="button"
                      data-testid={`button-copy-${i}`}
                      onClick={() => copyOutput(r.content, i)}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      {copiedIndex === i ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedIndex === i ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre
                    data-testid={`text-output-${i}`}
                    className="whitespace-pre-wrap break-words text-white/90 text-sm leading-relaxed font-sans bg-black/20 border border-white/10 rounded-xl p-4 overflow-auto max-h-[28rem]"
                  >
                    {r.content}
                  </pre>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/40 text-[11px] mt-3">
                    <span data-testid={`text-output-count-${i}`} className="text-white/50">
                      {countWords(r.content)} words · {r.content.length} chars
                    </span>
                    <span>Model: <span className="text-white/60">{r.model}</span></span>
                    <span>Max tokens: <span className="text-white/60">{r.maxTokens}</span></span>
                    <span>Latency: <span className="text-white/60">{r.latencyMs}ms</span></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                    <span className="text-white/40 text-[10px] flex items-center gap-1">
                      <Download className="h-3 w-3" /> Export
                    </span>
                    <ExportButtons
                      idPrefix={`output-${i}`}
                      onExport={(fmt) => exportVariation(r.content, i, fmt)}
                      disabled={exportBusy}
                    />
                    <span className="w-px h-4 bg-white/10 mx-1" />
                    <button
                      type="button"
                      data-testid={`button-image-prompt-${i}`}
                      onClick={() => genImagePrompt(r.content)}
                      disabled={imgLoading || vidLoading}
                      className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1 disabled:opacity-40"
                    >
                      <ImageIcon className="h-3 w-3" /> Image prompt
                    </button>
                    <button
                      type="button"
                      data-testid={`button-video-prompt-${i}`}
                      onClick={() => genVideoPrompt(r.content)}
                      disabled={imgLoading || vidLoading}
                      className="btn-secondary text-[10px] px-2 py-1 flex items-center gap-1 disabled:opacity-40"
                    >
                      <VideoIcon className="h-3 w-3" /> Video prompt
                    </button>
                    <button
                      type="button"
                      data-testid={`button-package-${i}`}
                      onClick={() => genPackage(r.content)}
                      disabled={imgLoading || vidLoading}
                      className="btn-primary text-[10px] px-2.5 py-1 flex items-center gap-1 disabled:opacity-40"
                    >
                      <PackageIcon className="h-3 w-3" /> Package
                    </button>
                    {r.type === "blog" && (
                      <button
                        type="button"
                        data-testid={`button-blog-draft-${i}`}
                        onClick={() => openBlogReview(r.content)}
                        className="btn-primary text-[10px] px-2.5 py-1 flex items-center gap-1"
                      >
                        <Newspaper className="h-3 w-3" /> Save as Blog Draft
                      </button>
                    )}
                  </div>
                </div>
              ))}

            {!mutation.isPending && !mutation.isError && results.length === 0 && (
              <div data-testid="status-empty" className="lux-card flex flex-col items-center justify-center text-white/30 py-16 gap-3 text-center">
                <Sparkles className="h-7 w-7" />
                <p className="text-sm max-w-xs">Pick a template or write a prompt, then generate — your content will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Content package: content + image prompt + video prompt */}
        {pkgOpen && (
          <div className="lux-card mt-6" data-testid="panel-package">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <PackageIcon className="h-4 w-4 text-[#F4A62A]" />
                <h2 className="text-white font-semibold text-sm">Content Package</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/40 text-[10px] flex items-center gap-1">
                  <Download className="h-3 w-3" /> Export package
                </span>
                <ExportButtons
                  idPrefix="package"
                  onExport={exportPackage}
                  disabled={exportBusy || packageSections().length === 0}
                />
                <button
                  type="button"
                  data-testid="button-close-package"
                  onClick={() => setPkgOpen(false)}
                  className="text-white/40 hover:text-white/80 text-[11px] px-2 py-1"
                >
                  Close
                </button>
              </div>
            </div>

            {pkgError && (
              <p data-testid="text-package-error" className="text-red-400 text-sm mb-3">{pkgError}</p>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              <PackageSection title="Content" testId="content" value={pkg.content} loading={false} copiedKey={copiedKey} onCopy={copyText} />
              <PackageSection title="Image Prompt" testId="image" value={pkg.imagePrompt} loading={imgLoading} copiedKey={copiedKey} onCopy={copyText} />
              <PackageSection title="Video Prompt" testId="video" value={pkg.videoPrompt} loading={vidLoading} copiedKey={copiedKey} onCopy={copyText} />
            </div>
          </div>
        )}

        {/* Publish blog draft: review + edit, then publish live to /blog */}
        {blogOpen && (
          <div className="lux-card mt-6" data-testid="panel-blog-publish">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-[#F4A62A]" />
                <h2 className="text-white font-semibold text-sm">Publish to Blog</h2>
              </div>
              <button
                type="button"
                data-testid="button-close-blog"
                onClick={() => setBlogOpen(false)}
                className="text-white/40 hover:text-white/80 text-[11px] px-2 py-1"
              >
                Close
              </button>
            </div>

            {blogPublished ? (
              <div
                data-testid="status-blog-published"
                className="flex flex-col items-start gap-3 bg-[#F4A62A]/10 border border-[#F4A62A]/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 text-[#F4A62A] font-semibold text-sm">
                  <Check className="h-4 w-4" />
                  {blogPublished.published ? "Published to your blog!" : "Saved as a draft."}
                </div>
                <p className="text-white/70 text-sm">
                  {blogPublished.published ? (
                    <>“{blogPublished.title}” is now live on your blog.</>
                  ) : (
                    <>“{blogPublished.title}” is saved as an unpublished draft — manage it under Dashboard → Blog.</>
                  )}
                </p>
                {blogPublished.published && (
                  <a
                    href={`/blog/${blogPublished.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-view-post"
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View Post
                  </a>
                )}
                {blogPublished.published && (
                  <div className="w-full" data-testid="block-campaign-link">
                    {campaignCreating ? (
                      <p className="text-white/60 text-xs flex items-center gap-1.5" data-testid="status-campaign-creating">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F4A62A]" /> Building your campaign…
                      </p>
                    ) : createdCampaignId != null ? (
                      <button
                        type="button"
                        data-testid="button-open-created-campaign"
                        onClick={() => onOpenCampaign?.(createdCampaignId)}
                        className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
                      >
                        <Megaphone className="h-3.5 w-3.5" /> Open Campaign
                      </button>
                    ) : campaignWarn ? (
                      <p className="text-amber-400/80 text-xs" data-testid="text-campaign-warn">{campaignWarn}</p>
                    ) : null}
                  </div>
                )}
                <button
                  type="button"
                  data-testid="button-blog-done"
                  onClick={() => setBlogOpen(false)}
                  className="text-white/40 hover:text-white/70 text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {blogError && (
                  <p data-testid="text-blog-error" className="text-red-400 text-sm">{blogError}</p>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-white/60 text-xs">Title</span>
                    <input
                      data-testid="input-blog-title"
                      value={blogForm.title}
                      onChange={(e) => onBlogTitleChange(e.target.value)}
                      maxLength={300}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 focus:border-[#F4A62A]/50 outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-white/60 text-xs">
                      Slug <span className="text-white/30">/blog/{blogForm.slug || "…"}</span>
                    </span>
                    <input
                      data-testid="input-blog-slug"
                      value={blogForm.slug}
                      onChange={(e) => onBlogSlugChange(e.target.value)}
                      maxLength={200}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 focus:border-[#F4A62A]/50 outline-none font-mono"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-white/60 text-xs">
                    Excerpt <span className="text-white/30">({blogForm.excerpt.length}/500)</span>
                  </span>
                  <textarea
                    data-testid="input-blog-excerpt"
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm((f) => ({ ...f, excerpt: e.target.value.slice(0, 500) }))}
                    rows={2}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 focus:border-[#F4A62A]/50 outline-none resize-y"
                  />
                </label>
                <label className="flex flex-col gap-1.5 md:max-w-xs">
                  <span className="text-white/60 text-xs">Category</span>
                  <input
                    data-testid="input-blog-category"
                    value={blogForm.category}
                    onChange={(e) => setBlogForm((f) => ({ ...f, category: e.target.value.slice(0, 60) }))}
                    maxLength={60}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 focus:border-[#F4A62A]/50 outline-none"
                  />
                </label>
                <div className="flex flex-col gap-1.5">
                  <span className="text-white/60 text-xs">Content preview</span>
                  <pre
                    data-testid="text-blog-body-preview"
                    className="whitespace-pre-wrap break-words text-white/70 text-xs leading-relaxed font-sans bg-black/20 border border-white/10 rounded-xl p-3 overflow-auto max-h-48"
                  >{blogForm.body}</pre>
                </div>
                {/* Mission Control — display-only pre-publish recommendations */}
                <div className="rounded-xl border border-[#F4A62A]/20 bg-[#F4A62A]/[0.05] p-3" data-testid="panel-mission-control">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-[#F4A62A]" />
                    <h3 className="text-white font-semibold text-xs uppercase tracking-wide">Mission Control</h3>
                    <span className="text-white/40 text-[11px]">— review before publishing</span>
                  </div>
                  <ul className="space-y-1.5">
                    {missionControl(blogForm.title, blogForm.body, blogForm.excerpt).map((r, i) => (
                      <li key={i} data-testid={`rec-mission-${i}`} className="flex items-start gap-2 text-xs">
                        {r.kind === "good"
                          ? <Check className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                          : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />}
                        <span className="text-white/70">{r.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    data-testid="button-blog-publish"
                    onClick={() => saveOrPublishBlog(true)}
                    disabled={blogPublishing || !blogForm.title.trim()}
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {blogPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {blogPublishing ? "Publishing…" : "Publish to Blog"}
                  </button>
                  <button
                    type="button"
                    data-testid="button-blog-save-draft"
                    onClick={() => saveOrPublishBlog(false)}
                    disabled={blogPublishing || !blogForm.title.trim()}
                    className="btn-secondary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Save className="h-4 w-4" /> Save as Draft
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prompt library + generation history */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="lux-card flex flex-col" data-testid="panel-prompt-library">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="h-4 w-4 text-[#F4A62A]" />
              <h2 className="text-white font-semibold text-sm">Prompt Library</h2>
              <span className="text-white/40 text-xs">({promptLibrary.length})</span>
            </div>
            {promptLibrary.length === 0 ? (
              <p data-testid="text-library-empty" className="text-white/30 text-sm py-6 text-center">
                No saved prompts yet. Save one with the button above to reuse it later.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {promptLibrary.map((p) => (
                  <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`row-prompt-${p.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate" data-testid={`text-prompt-name-${p.id}`}>{p.name}</p>
                        <p className="text-white/40 text-[11px] mt-0.5">
                          {CONTENT_TYPES.find((c) => c.value === p.type)?.label ?? p.type} · {platformLabel(p.platform)} · temp {p.temperature.toFixed(1)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          data-testid={`button-load-prompt-${p.id}`}
                          onClick={() => applySettings({ type: p.type, platform: p.platform, prompt: p.prompt, system: p.system, temperature: p.temperature, useBrandVoice: p.useBrandVoice, founderVoice: p.founderVoice })}
                          className="btn-secondary text-[11px] px-2.5 py-1"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          data-testid={`button-delete-prompt-${p.id}`}
                          aria-label="Delete saved prompt"
                          onClick={() => deletePrompt(p.id)}
                          className="text-white/40 hover:text-red-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lux-card flex flex-col" data-testid="panel-history">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-[#F4A62A]" />
              <h2 className="text-white font-semibold text-sm">History</h2>
              <span className="text-white/40 text-xs">({history.length})</span>
              {history.length > 0 && (
                <button
                  type="button"
                  data-testid="button-clear-history"
                  onClick={clearHistory}
                  className="ml-auto text-white/40 hover:text-red-400 text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p data-testid="text-history-empty" className="text-white/30 text-sm py-6 text-center">
                No generations yet. Your generated content will be saved here.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {history.map((h) => (
                  <div key={h.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`row-history-${h.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white/40 text-[11px]">
                        {CONTENT_TYPES.find((c) => c.value === h.type)?.label ?? h.type} · {platformLabel(h.platform)} · {new Date(h.at).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          data-testid={`button-load-history-${h.id}`}
                          onClick={() => applySettings({ type: h.type, platform: h.platform, prompt: h.prompt, system: h.system, temperature: h.temperature, useBrandVoice: h.useBrandVoice, founderVoice: h.founderVoice })}
                          className="btn-secondary text-[11px] px-2.5 py-1"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          data-testid={`button-copy-history-${h.id}`}
                          aria-label="Copy generated content"
                          onClick={() => navigator.clipboard.writeText(h.content).catch(() => {})}
                          className="text-white/40 hover:text-white/80 p-1"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-white/70 text-xs mt-1.5 line-clamp-3 whitespace-pre-wrap" data-testid={`text-history-content-${h.id}`}>
                      {h.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, testId }: { label: string; value: number; testId: string }) {
  const color = value >= 75 ? "#22c55e" : value >= 50 ? GOLD : "#ef4444";
  return (
    <div data-testid={testId}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-white/60 text-[11px] uppercase tracking-wide">{label}</span>
        <span className="text-white/90 text-xs font-semibold" data-testid={`${testId}-value`}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function CampaignDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [data, setData] = useState<CampaignDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Record<string, { content: string; status: string }>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<CampaignAssetKey>("blog");
  const [busyKey, setBusyKey] = useState<CampaignAssetKey | null>(null);
  const [savingKey, setSavingKey] = useState<CampaignAssetKey | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [genAll, setGenAll] = useState<{ done: number; total: number } | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiGetCampaign(id);
      setData(d);
      const map: Record<string, { content: string; status: string }> = {};
      for (const a of d.assets) map[a.assetKey] = { content: a.content, status: a.status };
      for (const k of CAMPAIGN_ASSET_KEYS) if (!map[k]) map[k] = { content: "", status: "empty" };
      setAssets(map);
      setDirty(new Set());
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load campaign.");
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  const getContent = (k: CampaignAssetKey) => assets[k]?.content ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const score = useMemo(() => scoreCampaign(getContent), [assets]);

  const setContent = (k: CampaignAssetKey, content: string) => {
    setAssets((m) => ({ ...m, [k]: { content, status: m[k]?.status === "empty" ? "edited" : (m[k]?.status ?? "edited") } }));
    setDirty((d) => new Set(d).add(k));
  };

  const persist = async (k: CampaignAssetKey, content: string, status: "generated" | "edited") => {
    const row = await apiUpdateAsset(id, k, content, status);
    setAssets((m) => ({ ...m, [k]: { content: row.content, status: row.status } }));
    setDirty((d) => { const n = new Set(d); n.delete(k); return n; });
  };

  const saveAsset = async (k: CampaignAssetKey) => {
    setSavingKey(k);
    setNotice(null);
    try { await persist(k, getContent(k), "edited"); }
    catch (e) { setError((e as Error)?.message ?? "Failed to save."); }
    finally { setSavingKey(null); }
  };

  // Generation reuses /api/ai/content. On rate-limit (429) we back off and
  // retry briefly so "Generate Everything" survives the 20-req/15-min limit.
  const genOnce = async (k: CampaignAssetKey): Promise<string> => {
    const topic = data?.topic || data?.title || "";
    const body = assetGenBody(k, topic, getContent("blog"));
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await generateContent(body);
        return res.content;
      } catch (e) {
        const msg = (e as Error)?.message ?? "";
        if (attempt < 2 && /rate|429|too many|limit/i.test(msg)) {
          await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
  };

  const generateAsset = async (k: CampaignAssetKey) => {
    if (k !== "blog" && !getContent("blog").trim()) {
      setError("Add blog content first — the other assets are repurposed from it.");
      setActiveKey("blog");
      return;
    }
    setBusyKey(k);
    setError(null);
    setNotice(null);
    try {
      const content = await genOnce(k);
      await persist(k, content, "generated");
    } catch (e) {
      setError((e as Error)?.message ?? "Generation failed.");
    } finally {
      setBusyKey(null);
    }
  };

  const generateEverything = async () => {
    if (!getContent("blog").trim()) {
      setError("Add blog content first — the other assets are repurposed from it.");
      setActiveKey("blog");
      return;
    }
    const targets = CAMPAIGN_ASSET_KEYS.filter((k) => k !== "blog");
    setError(null);
    setNotice(null);
    setGenAll({ done: 0, total: targets.length });
    let failures = 0;
    for (let i = 0; i < targets.length; i++) {
      const k = targets[i];
      setBusyKey(k);
      setActiveKey(k);
      try {
        const content = await genOnce(k);
        await persist(k, content, "generated");
      } catch {
        failures++;
      }
      setGenAll({ done: i + 1, total: targets.length });
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 700));
    }
    setBusyKey(null);
    setGenAll(null);
    setNotice(failures === 0 ? "All assets generated." : `Generated with ${failures} skipped — retry those individually.`);
  };

  const copyAsset = async (k: CampaignAssetKey) => {
    try {
      await navigator.clipboard.writeText(getContent(k));
      setCopiedKey(k);
      setTimeout(() => setCopiedKey((c) => (c === k ? null : c)), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const downloadAsset = (k: CampaignAssetKey) => {
    const meta = ASSET_META[k];
    const base = `${slugify(data?.title ?? "campaign")}-${meta.file}`;
    downloadBlob(new Blob([getContent(k)], { type: "text/plain;charset=utf-8" }), `${base}.${meta.ext}`);
  };

  const downloadZip = async () => {
    setZipBusy(true);
    setError(null);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folderName = slugify(data?.title ?? "campaign") || "campaign";
      const folder = zip.folder(folderName) ?? zip;
      for (const k of CAMPAIGN_ASSET_KEYS) {
        const content = getContent(k);
        if (!content.trim()) continue;
        const meta = ASSET_META[k];
        folder.file(`${meta.file}.${meta.ext}`, content);
      }
      const summary = [
        data?.title ?? "Campaign",
        "",
        `Source blog: ${data?.blogSlug ? `/blog/${data.blogSlug}` : "—"}`,
        `Generated: ${new Date().toLocaleString()}`,
        "",
        "Campaign Score",
        "--------------",
        `Overall:      ${score.overall}`,
        `SEO:          ${score.seo}`,
        `Brand Voice:  ${score.brandVoice}`,
        `Readability:  ${score.readability}`,
        `CTA:          ${score.cta}`,
        `Conversion:   ${score.conversion}`,
      ].join("\n");
      folder.file("campaign-summary.txt", summary);
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${folderName}-campaign.zip`);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to build the ZIP.");
    } finally {
      setZipBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/40 text-sm py-16 justify-center" data-testid="status-campaign-loading">
        <Loader2 className="h-5 w-5 animate-spin text-[#F4A62A]" /> Loading campaign…
      </div>
    );
  }
  if (!data) {
    return (
      <div data-testid="view-campaign-detail">
        <button type="button" data-testid="button-back-campaigns" onClick={onBack} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <p className="text-red-400 text-sm" data-testid="text-campaign-error">{error ?? "Campaign not found."}</p>
      </div>
    );
  }

  const active = assets[activeKey] ?? { content: "", status: "empty" };
  const blogEmpty = !getContent("blog").trim();

  return (
    <div data-testid="view-campaign-detail">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button type="button" data-testid="button-back-campaigns" onClick={onBack} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate" data-testid="text-detail-title">{data.title}</h1>
          {data.blogSlug && (
            <a href={`/blog/${data.blogSlug}`} target="_blank" rel="noopener noreferrer" className="text-[#F4A62A] hover:underline text-xs flex items-center gap-1 w-fit" data-testid="link-detail-blog">
              <ExternalLink className="h-3 w-3" /> /blog/{data.blogSlug}
            </a>
          )}
        </div>
      </div>

      {error && <p data-testid="text-campaign-error" className="text-red-400 text-sm mb-3">{error}</p>}
      {notice && <p data-testid="text-campaign-notice" className="text-[#F4A62A] text-sm mb-3">{notice}</p>}

      <div className="lux-card mb-5" data-testid="card-campaign-score">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="h-4 w-4 text-[#F4A62A]" />
          <h2 className="text-white font-semibold text-sm">Campaign Score</h2>
          <span className="ml-auto text-2xl font-bold text-white" data-testid="text-score-overall">{score.overall}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <ScoreBar label="SEO" value={score.seo} testId="score-seo" />
          <ScoreBar label="Brand Voice" value={score.brandVoice} testId="score-brand" />
          <ScoreBar label="Readability" value={score.readability} testId="score-readability" />
          <ScoreBar label="CTA" value={score.cta} testId="score-cta" />
          <ScoreBar label="Conversion" value={score.conversion} testId="score-conversion" />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-5">
        <button type="button" data-testid="button-generate-everything" onClick={generateEverything} disabled={!!genAll || !!busyKey || blogEmpty} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
          {genAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {genAll ? `Generating ${genAll.done}/${genAll.total}…` : "Generate Everything"}
        </button>
        <button type="button" data-testid="button-download-campaign" onClick={downloadZip} disabled={zipBusy} className="btn-secondary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
          {zipBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageIcon className="h-4 w-4" />}
          Download Campaign
        </button>
        {blogEmpty && <span className="text-white/40 text-xs">Add blog content to enable generation.</span>}
      </div>

      <div className="grid md:grid-cols-[200px_1fr] gap-5">
        <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0" data-testid="list-asset-tabs">
          {CAMPAIGN_ASSET_KEYS.map((k) => {
            const st = assets[k]?.status ?? "empty";
            const dot = st === "empty" ? "bg-white/20" : st === "generated" ? "bg-[#F4A62A]" : "bg-green-400";
            return (
              <button
                key={k}
                type="button"
                data-testid={`tab-asset-${k}`}
                onClick={() => setActiveKey(k)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs shrink-0 transition-colors ${activeKey === k ? "bg-[#F4A62A]/15 border border-[#F4A62A]/40 text-white" : "bg-white/[0.03] border border-white/10 text-white/70 hover:text-white"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot} ${busyKey === k ? "animate-pulse" : ""}`} />
                {ASSET_META[k].label}
              </button>
            );
          })}
        </div>

        <div className="lux-card flex flex-col" data-testid={`editor-asset-${activeKey}`}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <h3 className="text-white font-semibold text-sm">{ASSET_META[activeKey].label}</h3>
            <span className="text-white/40 text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10" data-testid="text-asset-status">{active.status}</span>
            {dirty.has(activeKey) && <span className="text-[#F4A62A] text-[11px]" data-testid="text-asset-dirty">unsaved</span>}
            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" data-testid="button-asset-generate" onClick={() => generateAsset(activeKey)} disabled={busyKey === activeKey || !!genAll} className="btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1 disabled:opacity-40">
                {busyKey === activeKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {active.content.trim() ? "Regenerate" : "Generate"}
              </button>
              <button type="button" data-testid="button-asset-copy" onClick={() => copyAsset(activeKey)} disabled={!active.content.trim()} className="btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1 disabled:opacity-40">
                {copiedKey === activeKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
              </button>
              <button type="button" data-testid="button-asset-download" onClick={() => downloadAsset(activeKey)} disabled={!active.content.trim()} className="btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1 disabled:opacity-40">
                <Download className="h-3 w-3" /> .{ASSET_META[activeKey].ext}
              </button>
            </div>
          </div>
          <textarea
            data-testid="textarea-asset-content"
            value={active.content}
            onChange={(e) => setContent(activeKey, e.target.value)}
            placeholder={busyKey === activeKey ? "Generating…" : "Empty — generate or write this asset."}
            rows={16}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 focus:border-[#F4A62A]/50 outline-none resize-y font-sans leading-relaxed"
          />
          <div className="flex items-center gap-2 mt-3">
            <button type="button" data-testid="button-asset-save" onClick={() => saveAsset(activeKey)} disabled={!dirty.has(activeKey) || savingKey === activeKey} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40">
              {savingKey === activeKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <span className="text-white/30 text-[11px]" data-testid="text-asset-words">{wordCount(active.content)} words</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignsView({ initialOpenId, onConsumed }: { initialOpenId: number | null; onConsumed: () => void }) {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(initialOpenId);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try { setRows(await apiListCampaigns()); }
    catch (e) { setError((e as Error)?.message ?? "Failed to load campaigns."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (initialOpenId != null) { setSelectedId(initialOpenId); onConsumed(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenId]);

  const remove = async (cid: number) => {
    if (!window.confirm("Delete this campaign and all its assets? This cannot be undone.")) return;
    setDeletingId(cid);
    try { await apiDeleteCampaign(cid); setRows((r) => r.filter((x) => x.id !== cid)); }
    catch (e) { setError((e as Error)?.message ?? "Failed to delete campaign."); }
    finally { setDeletingId(null); }
  };

  if (selectedId != null) {
    return <CampaignDetail id={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  return (
    <div data-testid="view-campaigns">
      <header className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
          <Megaphone className="h-6 w-6 text-black" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Campaigns</h1>
          <p className="text-white/50 text-xs">One blog → 12 channel-ready assets. Publish a blog to auto-create one.</p>
        </div>
        <button type="button" data-testid="button-refresh-campaigns" onClick={load} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </header>

      {error && <p data-testid="text-campaigns-error" className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm py-16 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#F4A62A]" /> Loading campaigns…
        </div>
      ) : rows.length === 0 ? (
        <div className="lux-card text-center py-16" data-testid="text-campaigns-empty">
          <Megaphone className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/60 text-sm">No campaigns yet.</p>
          <p className="text-white/40 text-xs mt-1">Generate a blog draft in the Content Studio and hit “Publish to Blog” to spin one up.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => (
            <div key={c.id} data-testid={`card-campaign-${c.id}`} className="lux-card flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <h2 className="text-white font-semibold text-sm leading-snug line-clamp-2 flex-1" data-testid={`text-campaign-title-${c.id}`}>{c.title}</h2>
                <button type="button" aria-label="Delete campaign" data-testid={`button-delete-campaign-${c.id}`} onClick={() => remove(c.id)} disabled={deletingId === c.id} className="text-white/40 hover:text-red-400 p-1 disabled:opacity-40">
                  {deletingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-2 text-white/40 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10">{c.source}</span>
                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              {c.blogSlug && (
                <a href={`/blog/${c.blogSlug}`} target="_blank" rel="noopener noreferrer" data-testid={`link-campaign-blog-${c.id}`} className="text-[#F4A62A] hover:underline text-xs flex items-center gap-1 w-fit">
                  <ExternalLink className="h-3 w-3" /> View source blog
                </a>
              )}
              <button type="button" data-testid={`button-open-campaign-${c.id}`} onClick={() => setSelectedId(c.id)} className="btn-primary text-xs px-4 py-2 flex items-center justify-center gap-1.5 mt-auto">
                <FolderOpen className="h-3.5 w-3.5" /> Open Campaign
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AiContentStudio() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  const [tab, setTab] = useState<"studio" | "campaigns">("studio");
  const [openCampaignId, setOpenCampaignId] = useState<number | null>(null);
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;

  const tabBtn = (key: "studio" | "campaigns", label: string, Icon: typeof Sparkles) => (
    <button
      type="button"
      data-testid={`tab-${key}`}
      onClick={() => setTab(key)}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === key ? "bg-[#F4A62A] text-black" : "bg-white/[0.06] border border-white/10 text-white/70 hover:text-white"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2" data-testid="tabs-content-studio">
          {tabBtn("studio", "Content Studio", Sparkles)}
          {tabBtn("campaigns", "Campaigns", Megaphone)}
        </div>
      </div>
      {tab === "studio" ? (
        <Studio onOpenCampaign={(cid) => { setOpenCampaignId(cid); setTab("campaigns"); }} />
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <CampaignsView initialOpenId={openCampaignId} onConsumed={() => setOpenCampaignId(null)} />
        </div>
      )}
    </div>
  );
}
