import { useCallback } from "react";

export function useTrackClick() {
  return useCallback((product: string, label: string) => {
    fetch("/api/track/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, label }),
    }).catch(() => {});
  }, []);
}
