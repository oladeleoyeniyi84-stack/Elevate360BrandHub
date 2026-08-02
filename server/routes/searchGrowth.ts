// Phase 72.5 — Search Growth Operations founder API.
// Mounted at /api/dashboard/search-growth (dynamic import in registerRoutes).
//
// Every endpoint: founder-authenticated, JSON-only, Zod-validated, explicit
// state-transition enforcement, audit timestamps recorded server-side.
// Clients can only DECIDE on server-generated actions — they can never create
// actions, set scores, or supply evidence/metrics.

import { Router } from "express";
import { z, ZodError } from "zod";
import { requireDashboardAuth, rateLimit } from "../routes";
import {
  searchGrowthDismissSchema,
  searchGrowthCompleteSchema,
  searchGrowthApproveSchema,
  SEARCH_GROWTH_ACTION_STATUSES,
  SEARCH_GROWTH_ACTION_TYPES,
} from "@shared/schema";
import {
  listSearchGrowthActions,
  getSearchGrowthSummary,
  transitionSearchGrowthAction,
  InvalidTransitionError,
} from "../services/searchGrowthActions";

export const searchGrowthRouter = Router();

const listQuerySchema = z.object({
  status: z.enum(SEARCH_GROWTH_ACTION_STATUSES).optional(),
  actionType: z.enum(SEARCH_GROWTH_ACTION_TYPES).optional(),
  targetPath: z.string().trim().min(1).max(200).optional(),
  targetQuery: z.string().trim().min(1).max(200).optional(),
  minPriority: z.coerce.number().int().min(0).max(100).optional(),
}).strip();

const idParam = z.coerce.number().int().positive();

searchGrowthRouter.get("/actions", requireDashboardAuth, async (req, res) => {
  try {
    const filters = listQuerySchema.parse(req.query ?? {});
    const [actions, summary] = await Promise.all([
      listSearchGrowthActions(filters),
      getSearchGrowthSummary(),
    ]);
    res.json({ actions, summary });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Invalid filters", details: error.errors });
    }
    console.error("[search-growth] list failed:", error);
    res.status(500).json({ error: "Failed to load growth actions" });
  }
});

type Decision = "approved" | "dismissed" | "in_progress" | "completed";

async function decide(req: any, res: any, to: Decision, note?: string) {
  try {
    const id = idParam.parse(req.params.id);
    const action = await transitionSearchGrowthAction(id, to, { note });
    res.json({ ok: true, action });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Invalid action id", details: error.errors });
    }
    if (error instanceof InvalidTransitionError) {
      return res.status(409).json({ error: error.message });
    }
    console.error(`[search-growth] ${to} failed:`, error);
    res.status(500).json({ error: "Decision failed" });
  }
}

searchGrowthRouter.post("/actions/:id/approve", requireDashboardAuth, rateLimit(30, 300), async (req, res) => {
  try {
    const body = searchGrowthApproveSchema.parse(req.body ?? {});
    await decide(req, res, "approved", body.note);
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: "Invalid request", details: error.errors });
    res.status(500).json({ error: "Decision failed" });
  }
});

searchGrowthRouter.post("/actions/:id/dismiss", requireDashboardAuth, rateLimit(30, 300), async (req, res) => {
  try {
    const body = searchGrowthDismissSchema.parse(req.body ?? {}); // reason REQUIRED
    await decide(req, res, "dismissed", body.reason);
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: "A dismissal reason is required", details: error.errors });
    res.status(500).json({ error: "Decision failed" });
  }
});

searchGrowthRouter.post("/actions/:id/start", requireDashboardAuth, rateLimit(30, 300), async (req, res) => {
  await decide(req, res, "in_progress");
});

searchGrowthRouter.post("/actions/:id/complete", requireDashboardAuth, rateLimit(30, 300), async (req, res) => {
  try {
    const body = searchGrowthCompleteSchema.parse(req.body ?? {}); // implementation note REQUIRED
    await decide(req, res, "completed", body.implementationNote);
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: "An implementation note is required", details: error.errors });
    res.status(500).json({ error: "Decision failed" });
  }
});
