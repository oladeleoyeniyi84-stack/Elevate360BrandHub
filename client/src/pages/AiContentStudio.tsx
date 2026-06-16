import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles, Eye, EyeOff, Loader2, Copy, Check, AlertTriangle, Wand2,
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

interface GenerateResponse {
  type: string;
  model: string;
  maxTokens: number;
  latencyMs: number;
  content: string;
}

// Calls the founder-only, PIN-gated endpoint. Credentials are sent so the
// dashboard session cookie authenticates the request. The DeepSeek API key
// lives only on the server — it is never referenced or exposed client-side.
async function generateContent(body: {
  type: ContentType;
  prompt: string;
  system?: string;
  temperature?: number;
}): Promise<GenerateResponse> {
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
  const [prompt, setPrompt] = useState("");
  const [system, setSystem] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: generateContent,
    onSuccess: () => setCopied(false),
  });

  const result = mutation.data;
  const canSubmit = prompt.trim().length > 0 && !mutation.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      type,
      prompt: prompt.trim(),
      system: system.trim() || undefined,
      temperature,
    });
  };

  const copyOutput = async () => {
    if (!result?.content) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
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

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input panel */}
          <form onSubmit={submit} className="lux-card space-y-5">
            <div>
              <label className="block text-white/70 text-xs uppercase tracking-wide mb-2">Content type</label>
              <select
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
              <label className="block text-white/70 text-xs uppercase tracking-wide mb-2">Prompt / topic</label>
              <textarea
                data-testid="input-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What should this content be about? Be specific about audience, tone, and goal."
                rows={6}
                className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 resize-y"
              />
            </div>

            <div>
              <label className="block text-white/70 text-xs uppercase tracking-wide mb-2">
                System instruction <span className="text-white/30 normal-case">(optional)</span>
              </label>
              <textarea
                data-testid="input-system"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder="Override the default brand voice with custom guidance for this generation."
                rows={3}
                className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50 resize-y"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/70 text-xs uppercase tracking-wide">Temperature</label>
                <span data-testid="text-temperature-value" className="text-[#F4A62A] text-sm font-bold tabular-nums">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
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

            <button
              type="submit"
              data-testid="button-generate"
              disabled={!canSubmit}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> Generate content
                </>
              )}
            </button>
          </form>

          {/* Output panel */}
          <div className="lux-card flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm">Generated content</h2>
              {result?.content && (
                <button
                  type="button"
                  data-testid="button-copy"
                  onClick={copyOutput}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>

            {mutation.isPending && (
              <div data-testid="status-loading" className="flex-1 flex flex-col items-center justify-center text-white/50 py-16 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-[#F4A62A]" />
                <p className="text-sm">Generating your {type}…</p>
              </div>
            )}

            {mutation.isError && !mutation.isPending && (
              <div data-testid="status-error" className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center">
                <AlertTriangle className="h-7 w-7 text-red-400" />
                <p className="text-red-400 text-sm max-w-xs">
                  {(mutation.error as Error)?.message ?? "Something went wrong. Please try again."}
                </p>
              </div>
            )}

            {!mutation.isPending && !mutation.isError && result?.content && (
              <div className="flex-1 flex flex-col">
                <pre
                  data-testid="text-output"
                  className="flex-1 whitespace-pre-wrap break-words text-white/90 text-sm leading-relaxed font-sans bg-black/20 border border-white/10 rounded-xl p-4 overflow-auto"
                >
                  {result.content}
                </pre>
                <div data-testid="status-success" className="flex flex-wrap gap-x-4 gap-y-1 text-white/40 text-[11px] mt-3">
                  <span>Model: <span className="text-white/60">{result.model}</span></span>
                  <span>Max tokens: <span className="text-white/60">{result.maxTokens}</span></span>
                  <span>Latency: <span className="text-white/60">{result.latencyMs}ms</span></span>
                </div>
              </div>
            )}

            {!mutation.isPending && !mutation.isError && !result?.content && (
              <div data-testid="status-empty" className="flex-1 flex flex-col items-center justify-center text-white/30 py-16 gap-3 text-center">
                <Sparkles className="h-7 w-7" />
                <p className="text-sm max-w-xs">Fill in a prompt and hit generate — your content will appear here.</p>
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
