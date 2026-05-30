// Phase 67 — Cognitive OS: typed admin fetch helpers.
//
// Thin wrappers over the PIN-gated /api/admin/cognitive-os endpoints. All calls
// include credentials; a 401 clears the cached auth flag and reloads to the gate.

import type {
  CognitiveOverview,
  CognitiveDecision,
  CognitiveConflict,
  CognitiveBriefing,
  RankedSignal,
  CognitiveScanResult,
} from "@shared/types/cognitive";

const BASE = "/api/admin/cognitive-os";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (r.status === 401) {
    sessionStorage.removeItem("e360_dashboard_auth");
    window.location.reload();
    throw new Error("Unauthorized");
  }
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message ?? `Request failed (${r.status})`);
  return r.json();
}

export const cognitiveApi = {
  overview: () => req<CognitiveOverview>("/overview"),
  signals: () => req<{ signals: RankedSignal[]; total: number }>("/signals"),
  decisions: (params?: { kind?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.kind) q.set("kind", params.kind);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return req<CognitiveDecision[]>(`/decisions${qs ? `?${qs}` : ""}`);
  },
  generateDecisions: () => req<{ generated: number; decisions: CognitiveDecision[] }>("/decisions/generate", { method: "POST" }),
  setDecisionStatus: (id: number, status: string) =>
    req<CognitiveDecision>(`/decisions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  conflicts: (status = "open") => req<CognitiveConflict[]>(`/conflicts?status=${status}`),
  generateConflicts: () => req<{ generated: number; conflicts: CognitiveConflict[] }>("/conflicts/generate", { method: "POST" }),
  setConflictStatus: (id: number, status: string) =>
    req<CognitiveConflict>(`/conflicts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  briefings: (period?: string) => req<CognitiveBriefing[]>(`/briefings${period ? `?period=${period}` : ""}`),
  briefing: (id: number) => req<CognitiveBriefing>(`/briefings/${id}`),
  generateBriefing: (period: string) => req<CognitiveBriefing>("/briefings", { method: "POST", body: JSON.stringify({ period }) }),
  run: () => req<CognitiveScanResult>("/run", { method: "POST" }),
};
