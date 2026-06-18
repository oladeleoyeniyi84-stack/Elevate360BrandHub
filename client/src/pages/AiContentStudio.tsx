import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles, Eye, EyeOff, Loader2, Copy, Check, AlertTriangle, Wand2, LayoutTemplate,
  Layers, RefreshCw, Save, History, Trash2, Bookmark,
  Download, Image as ImageIcon, Video as VideoIcon, Package as PackageIcon,
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

function Studio() {
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

export default function AiContentStudio() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("e360_dashboard_auth") === "true");
  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <Studio />;
}
