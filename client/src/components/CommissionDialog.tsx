import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Palette, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

interface CommissionFormData {
  name: string;
  email: string;
  projectType: string;
  style: string;
  budget: string;
  description: string;
}

const PROJECT_TYPES = [
  "Digital Portrait",
  "Logo & Brand Identity",
  "Wall Art / Print",
  "Social Media Graphics",
  "Book Cover Design",
  "Custom Illustration",
  "Other",
];

const STYLES = [
  "Realistic",
  "Abstract",
  "Minimalist",
  "Illustrative / Cartoon",
  "Surrealist",
  "Typography-based",
  "Mixed / Not sure yet",
];

const BUDGETS = [
  "Under $50",
  "$50 – $150",
  "$150 – $300",
  "$300 – $500",
  "$500+",
  "Let's discuss",
];

const EMPTY: CommissionFormData = {
  name: "", email: "", projectType: "", style: "", budget: "", description: "",
};

interface CommissionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CommissionDialog({ open, onClose }: CommissionDialogProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CommissionFormData>(EMPTY);
  const [success, setSuccess] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot — must stay empty

  const mutation = useMutation({
    mutationFn: async () => {
      const message = [
        `[ART COMMISSION REQUEST]`,
        ``,
        `Project Type: ${form.projectType}`,
        `Style: ${form.style}`,
        `Budget: ${form.budget}`,
        ``,
        `Description:`,
        form.description,
      ].join("\n");

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, message, website }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Something went wrong");
      }
      return res.json();
    },
    onSuccess: () => setSuccess(true),
  });

  const set = (key: keyof CommissionFormData, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const step0Valid = form.name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const step1Valid = form.projectType !== "" && form.style !== "" && form.budget !== "";
  const step2Valid = form.description.trim().length >= 10;

  const handleClose = () => {
    onClose();
    setTimeout(() => { setStep(0); setForm(EMPTY); setSuccess(false); mutation.reset(); }, 300);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-3xl lux-card shadow-2xl animate-in slide-in-from-bottom-6 fade-in duration-300 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg leading-tight">Commission Custom Art</h2>
              <p className="text-xs text-muted-foreground">Elevate360 Art Studio</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            data-testid="button-close-commission"
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-7 py-6">
          {/* Honeypot — hidden from real users, bots fill it automatically */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
          />
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-bold mb-2">Request Received!</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Thanks, <span className="text-foreground font-medium">{form.name}</span>! We'll review your commission request and get back to you at <span className="text-primary">{form.email}</span> within 2–3 business days.
                </p>
              </div>
              <button
                onClick={handleClose}
                data-testid="button-commission-done"
                className="btn-primary mt-4"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {["Your Details", "Project Info", "Description"].map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                        i < step ? "bg-primary border-primary text-black" :
                        i === step ? "border-primary text-primary" :
                        "border-white/20 text-muted-foreground"
                      }`}>
                        {i < step ? "✓" : i + 1}
                      </div>
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                    {i < 2 && <div className={`h-px flex-1 w-6 ${i < step ? "bg-primary/50" : "bg-white/10"}`} />}
                  </div>
                ))}
              </div>

              {/* Step 0 — Contact details */}
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Name</label>
                    <input
                      type="text"
                      data-testid="input-commission-name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email Address</label>
                    <input
                      type="email"
                      data-testid="input-commission-email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                    />
                  </div>
                </div>
              )}

              {/* Step 1 — Project type, style, budget */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2">Project Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PROJECT_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          data-testid={`option-project-${t.toLowerCase().replace(/\s+/g, "-")}`}
                          onClick={() => set("projectType", t)}
                          className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                            form.projectType === t
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2">Art Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => set("style", s)}
                          className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                            form.style === s
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2">Budget Range</label>
                    <div className="grid grid-cols-3 gap-2">
                      {BUDGETS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => set("budget", b)}
                          className={`text-center px-2 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                            form.budget === b
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Description */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Describe your vision
                    </label>
                    <textarea
                      data-testid="input-commission-description"
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="Tell us what you have in mind — colors, mood, references, intended use, or anything that helps us understand your vision..."
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{form.description.length} characters (minimum 10)</p>
                  </div>
                  <div className="lux-card rounded-2xl p-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground/80 mb-2">Your request summary</p>
                    <p><span className="text-foreground/60">Type:</span> {form.projectType}</p>
                    <p><span className="text-foreground/60">Style:</span> {form.style}</p>
                    <p><span className="text-foreground/60">Budget:</span> {form.budget}</p>
                  </div>
                  {mutation.isError && (
                    <p className="text-red-400 text-xs">{(mutation.error as Error).message}</p>
                  )}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-7 pt-5 border-t border-white/8">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                ) : (
                  <span />
                )}

                {step < 2 ? (
                  <button
                    type="button"
                    data-testid={`button-commission-next-${step}`}
                    disabled={step === 0 ? !step0Valid : !step1Valid}
                    onClick={() => setStep(step + 1)}
                    className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="button-commission-submit"
                    disabled={!step2Valid || mutation.isPending}
                    onClick={() => mutation.mutate()}
                    className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {mutation.isPending ? "Sending…" : "Submit Request"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
