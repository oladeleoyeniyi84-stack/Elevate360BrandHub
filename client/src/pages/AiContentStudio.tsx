import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles, Eye, EyeOff, Loader2, Copy, Check, AlertTriangle, Wand2, LayoutTemplate,
  Layers, RefreshCw, Save, History, Trash2, Bookmark,
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
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">
                Generated content{results.length > 1 ? ` · ${results.length} variations` : ""}
              </h2>
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
