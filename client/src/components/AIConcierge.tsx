import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { conciergeModes, type ConciergeModeKey } from "@/config/conciergeModes";
import { ConciergePresenceHeader } from "@/components/concierge/ConciergePresenceHeader";
import { CreatorAvatar } from "@/components/concierge/CreatorAvatar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function generateSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getOrCreateSessionId(): string {
  const key = "e360_chat_session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = generateSessionId();
    sessionStorage.setItem(key, id);
  }
  return id;
}

const SESSION_CHIPS: { label: string; mode: ConciergeModeKey }[] = [
  { label: "Brand Strategy", mode: "brandStrategy" },
  { label: "AI Content", mode: "aiContent" },
  { label: "Creative Direction", mode: "creativeDirection" },
  { label: "App / Product", mode: "appProduct" },
  { label: "Collaboration", mode: "collaboration" },
];

const QUICK_PROMPTS = [
  "Tell me about your apps",
  "Show me your books",
  "What is Elevate360?",
  "How can I contact you?",
];

export function AIConcierge() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ConciergeModeKey>("default");
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(getOrCreateSessionId);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const modeConfig = useMemo(() => conciergeModes[mode], [mode]);

  const welcomeMessage = useMemo<Message>(
    () => ({ role: "assistant", content: modeConfig.intro }),
    [modeConfig]
  );

  // Reset messages when mode changes
  useEffect(() => {
    setMessages([welcomeMessage]);
  }, [welcomeMessage]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  // Listen for external mode changes from session card clicks
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ mode: ConciergeModeKey }>;
      if (custom.detail?.mode) {
        setMode(custom.detail.mode);
        setOpen(true);
      }
    };
    window.addEventListener("e360:set-concierge-mode", handler as EventListener);
    return () => window.removeEventListener("e360:set-concierge-mode", handler as EventListener);
  }, []);

  const chatMutation = useMutation({
    mutationFn: async ({ message, name, email }: { message: string; name?: string; email?: string }) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message,
          sessionMode: mode,
          ...(name && { leadName: name }),
          ...(email && { leadEmail: email }),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Something went wrong");
      }
      return res.json() as Promise<{ reply: string }>;
    },
    onMutate: ({ message }) => {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setSpeaking(true);
    },
    onSuccess: ({ reply }) => {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!leadCaptured && messages.length >= 4) {
        setShowLeadForm(true);
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having a moment. Please try again!" },
      ]);
    },
    onSettled: () => {
      setTimeout(() => setSpeaking(false), 900);
    },
  });

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatMutation.isPending) return;
      setInput("");
      chatMutation.mutate({ message: trimmed });
    },
    [chatMutation]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowLeadForm(false);
    setLeadCaptured(true);
    chatMutation.mutate({
      message: `My name is ${leadName} and my email is ${leadEmail}. Please keep me updated.`,
      name: leadName,
      email: leadEmail,
    });
  };

  const handleModeChange = (newMode: ConciergeModeKey) => {
    setMode(newMode);
    setShowLeadForm(false);
  };

  const isLive = mode !== "default";

  return (
    <>
      {/* Floating launcher — creator avatar */}
      <button
        data-testid="button-ai-concierge-launcher"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Elevate360 AI Concierge"
        className="fixed bottom-6 right-6 z-50 transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ filter: "drop-shadow(0 8px 24px rgba(244,166,42,0.45))" }}
      >
        {open ? (
          <div className="w-14 h-14 rounded-full bg-[#F4A62A] flex items-center justify-center text-black shadow-lg">
            <X className="h-6 w-6" />
          </div>
        ) : (
          <CreatorAvatar size="lg" live />
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[90vw] max-w-sm transition-all duration-300 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div
          className="rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.55)] border border-white/10 flex flex-col"
          style={{ maxHeight: "72vh", background: "hsl(220 50% 10%)" }}
        >
          {/* Founder-presence header */}
          <ConciergePresenceHeader mode={mode} live={isLive} speaking={speaking} />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <CreatorAvatar size="sm" live={isLive} className="mt-0.5 flex-shrink-0" />
                )}
                <div
                  data-testid={`chat-message-${msg.role}-${i}`}
                  className={`max-w-[76%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#F4A62A] text-black font-medium rounded-br-sm"
                      : "bg-white/8 text-white/90 rounded-bl-sm border border-white/8"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex gap-2 justify-start">
                <CreatorAvatar size="sm" speaking className="mt-0.5 flex-shrink-0" />
                <div className="bg-white/8 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F4A62A]" />
                  <span className="text-xs text-white/50">Thinking…</span>
                </div>
              </div>
            )}

            {/* Lead capture form */}
            {showLeadForm && !leadCaptured && (
              <div className="bg-white/6 border border-[#F4A62A]/20 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-white/70 leading-relaxed">
                  I'd love to keep you updated on Elevate360 news and releases. Drop your name and email below!
                </p>
                <form onSubmit={handleLeadSubmit} className="space-y-2">
                  <input
                    data-testid="input-lead-name"
                    type="text"
                    placeholder="Your name"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    required
                    className="w-full rounded-xl px-3 py-2 text-sm bg-white/8 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50"
                  />
                  <input
                    data-testid="input-lead-email"
                    type="email"
                    placeholder="your@email.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    required
                    className="w-full rounded-xl px-3 py-2 text-sm bg-white/8 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/50"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      data-testid="button-lead-submit"
                      className="flex-1 bg-[#F4A62A] text-black text-xs font-semibold rounded-xl py-2 hover:bg-[#ffb84d] transition"
                    >
                      Stay Connected
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowLeadForm(false); setLeadCaptured(true); }}
                      className="px-3 text-xs text-white/40 hover:text-white/60 transition"
                    >
                      Skip
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Session mode chips — always visible */}
          <div className="px-4 pb-2 pt-1 flex flex-wrap gap-1.5 border-t border-white/5">
            {SESSION_CHIPS.map((chip) => (
              <button
                key={chip.mode}
                data-testid={`button-mode-${chip.mode}`}
                onClick={() => handleModeChange(chip.mode)}
                className={`e360-chip text-xs ${mode === chip.mode ? "e360-chip-active" : ""}`}
              >
                {chip.label}
              </button>
            ))}
            {mode !== "default" && (
              <button
                data-testid="button-mode-default"
                onClick={() => handleModeChange("default")}
                className="e360-chip text-xs opacity-50"
              >
                Reset
              </button>
            )}
          </div>

          {/* Quick prompts (only on first message in default mode) */}
          {messages.length === 1 && mode === "default" && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  data-testid={`button-quick-prompt-${prompt.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#F4A62A]/30 text-[#F4A62A] hover:bg-[#F4A62A]/10 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
            <input
              ref={inputRef}
              data-testid="input-chat-message"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={modeConfig.placeholder}
              disabled={chatMutation.isPending}
              className="flex-1 bg-white/6 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F4A62A]/40 disabled:opacity-50"
            />
            <button
              type="submit"
              data-testid="button-chat-send"
              disabled={!input.trim() || chatMutation.isPending}
              className="w-9 h-9 rounded-full bg-[#F4A62A] flex items-center justify-center text-black disabled:opacity-40 hover:bg-[#ffb84d] transition flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
