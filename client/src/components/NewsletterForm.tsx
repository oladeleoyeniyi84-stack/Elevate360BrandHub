import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { email: string }) => {
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
    if (email) mutation.mutate({ email });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="email"
          data-testid="input-newsletter-email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-10 h-14 rounded-full bg-background/50 border-border text-foreground"
          required
        />
      </div>
      <Button
        type="submit"
        data-testid="button-subscribe-newsletter"
        className="rounded-full h-14 px-8 text-base font-semibold"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Subscribing..." : "Subscribe"}
      </Button>
    </form>
  );
}