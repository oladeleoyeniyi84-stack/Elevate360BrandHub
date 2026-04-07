import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";

interface NewsletterFormProps {
  compact?: boolean;
}

export function NewsletterForm({ compact }: NewsletterFormProps = {}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — must stay empty
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { email: string; website: string }) => {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Something went wrong");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subscribed!", description: "You'll receive updates from Elevate360." });
      setEmail("");
    },
    onError: (error: Error) => {
      toast({ title: "Heads up", description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) mutation.mutate({ email, website });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={compact
        ? "flex flex-col gap-2 w-full"
        : "flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto"
      }
    >
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
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="email"
          data-testid="input-newsletter-email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={compact
            ? "pl-10 h-11 rounded-xl bg-white/5 border-white/10 text-foreground text-sm"
            : "pl-10 h-14 rounded-full bg-background/50 border-border text-foreground"
          }
          required
        />
      </div>
      <Button
        type="submit"
        data-testid="button-subscribe-newsletter"
        className={compact
          ? "rounded-xl h-11 px-6 text-sm font-semibold"
          : "rounded-full h-14 px-8 text-base font-semibold"
        }
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Subscribing..." : "Subscribe"}
      </Button>
    </form>
  );
}