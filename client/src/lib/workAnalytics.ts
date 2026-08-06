// Phase 72.6 — fire-and-forget analytics for the public work showcase.
// Uses the existing first-party homepage analytics endpoint and vocabulary.
// Failures never block navigation; no personal data is ever attached.

type WorkEvent =
  | "work_section_view"
  | "work_project_view"
  | "work_project_cta_click"
  | "work_filter_used"
  | "current_initiative_view"
  | "consultation_cta_click";

export interface WorkEventMetadata {
  projectId?: string;
  projectCategory?: string;
  projectStatus?: string;
  sourcePage?: string;
  targetRoute?: string;
  filter?: string;
}

export function trackWorkEvent(event: WorkEvent, metadata: WorkEventMetadata = {}): void {
  try {
    fetch("/api/analytics/homepage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, metadata }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // analytics must never interfere with the page
  }
}
