import { useEffect } from "react";

export function useTrackPageView(page: string) {
  useEffect(() => {
    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    }).catch(() => {});
  }, [page]);
}
