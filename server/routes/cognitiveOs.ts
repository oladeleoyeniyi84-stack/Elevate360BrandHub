// Phase 67 — Cognitive Operating System: admin routes.
//
// All PIN-gated via requireDashboardAuth. Recommendation-only — nothing here
// mutates money / pricing / email / infra / secrets or executes autonomously.

import { Router } from "express";
import { requireDashboardAuth } from "../routes";
import { storage } from "../storage";
import { rankSignals } from "../services/cognitive/priorityEngine";
import {
  buildCognitiveOverview,
  runCognitiveScan,
  PERIODS,
  type PeriodType,
} from "../services/cognitive";
import {
  generateCognitiveDecisions,
} from "../services/cognitive/decisionEngine";
import {
  generateCognitiveConflicts,
} from "../services/cognitive/conflictEngine";
import {
  generateCognitiveBriefing,
} from "../services/cognitive/briefingEngine";

export const cognitiveOsRouter = Router();

cognitiveOsRouter.use(requireDashboardAuth);

// ── Overview ────────────────────────────────────────────────────────────────
cognitiveOsRouter.get("/overview", async (_req, res) => {
  try {
    res.json(await buildCognitiveOverview());
  } catch (e: any) {
    console.error("[cognitive-os] overview error:", e?.message);
    res.status(500).json({ message: "Failed to build cognitive overview" });
  }
});

// ── Unified signals (read-only, ranked) ──────────────────────────────────────
cognitiveOsRouter.get("/signals", async (_req, res) => {
  try {
    const signals = await storage.getAllCognitiveSignals();
    res.json({ signals: rankSignals(signals), total: signals.length });
  } catch (e: any) {
    console.error("[cognitive-os] signals error:", e?.message);
    res.status(500).json({ message: "Failed to load cognitive signals" });
  }
});

// ── Decisions ────────────────────────────────────────────────────────────────
cognitiveOsRouter.get("/decisions", async (req, res) => {
  try {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : "open";
    res.json(await storage.getCognitiveDecisions({ kind, status }));
  } catch (e: any) {
    console.error("[cognitive-os] decisions error:", e?.message);
    res.status(500).json({ message: "Failed to load decisions" });
  }
});

cognitiveOsRouter.post("/decisions/generate", async (_req, res) => {
  try {
    const decisions = await generateCognitiveDecisions();
    res.json({ generated: decisions.length, decisions });
  } catch (e: any) {
    console.error("[cognitive-os] decisions/generate error:", e?.message);
    res.status(500).json({ message: "Failed to generate decisions" });
  }
});

cognitiveOsRouter.patch("/decisions/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status ?? "");
    if (!Number.isFinite(id) || !["open", "acknowledged", "dismissed"].includes(status)) {
      return res.status(422).json({ message: "Invalid id or status" });
    }
    const row = await storage.updateCognitiveDecisionStatus(id, status);
    if (!row) return res.status(404).json({ message: "Decision not found" });
    res.json(row);
  } catch (e: any) {
    console.error("[cognitive-os] decisions/:id error:", e?.message);
    res.status(500).json({ message: "Failed to update decision" });
  }
});

// ── Conflicts ────────────────────────────────────────────────────────────────
cognitiveOsRouter.get("/conflicts", async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "open";
    res.json(await storage.getCognitiveConflicts({ status }));
  } catch (e: any) {
    console.error("[cognitive-os] conflicts error:", e?.message);
    res.status(500).json({ message: "Failed to load conflicts" });
  }
});

cognitiveOsRouter.post("/conflicts/generate", async (_req, res) => {
  try {
    const conflicts = await generateCognitiveConflicts();
    res.json({ generated: conflicts.length, conflicts });
  } catch (e: any) {
    console.error("[cognitive-os] conflicts/generate error:", e?.message);
    res.status(500).json({ message: "Failed to generate conflicts" });
  }
});

cognitiveOsRouter.patch("/conflicts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status ?? "");
    if (!Number.isFinite(id) || !["open", "acknowledged", "resolved"].includes(status)) {
      return res.status(422).json({ message: "Invalid id or status" });
    }
    const row = await storage.updateCognitiveConflictStatus(id, status);
    if (!row) return res.status(404).json({ message: "Conflict not found" });
    res.json(row);
  } catch (e: any) {
    console.error("[cognitive-os] conflicts/:id error:", e?.message);
    res.status(500).json({ message: "Failed to update conflict" });
  }
});

// ── Briefings ────────────────────────────────────────────────────────────────
cognitiveOsRouter.get("/briefings", async (req, res) => {
  try {
    const period = typeof req.query.period === "string" ? req.query.period : undefined;
    res.json(await storage.getCognitiveBriefings(period, 30));
  } catch (e: any) {
    console.error("[cognitive-os] briefings error:", e?.message);
    res.status(500).json({ message: "Failed to load briefings" });
  }
});

cognitiveOsRouter.get("/briefings/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(422).json({ message: "Invalid id" });
    const row = await storage.getCognitiveBriefing(id);
    if (!row) return res.status(404).json({ message: "Briefing not found" });
    res.json(row);
  } catch (e: any) {
    console.error("[cognitive-os] briefings/:id error:", e?.message);
    res.status(500).json({ message: "Failed to load briefing" });
  }
});

cognitiveOsRouter.post("/briefings", async (req, res) => {
  try {
    const period = String(req.body?.period ?? "daily") as PeriodType;
    if (!PERIODS.includes(period)) return res.status(422).json({ message: "Invalid period" });
    res.json(await generateCognitiveBriefing(period));
  } catch (e: any) {
    console.error("[cognitive-os] briefings POST error:", e?.message);
    res.status(500).json({ message: "Failed to generate briefing" });
  }
});

// ── Full scan (decisions + conflicts + daily briefing) ───────────────────────
cognitiveOsRouter.post("/run", async (_req, res) => {
  try {
    res.json(await runCognitiveScan());
  } catch (e: any) {
    console.error("[cognitive-os] run error:", e?.message);
    res.status(500).json({ message: "Failed to run cognitive scan" });
  }
});
