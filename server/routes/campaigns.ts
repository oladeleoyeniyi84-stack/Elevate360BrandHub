// Content Distribution Engine — Campaign routes (Phase 72).
//
// Founder/admin only — every request is PIN-gated via requireDashboardAuth at
// the router level, so unauthenticated calls return 401 JSON (never the SPA
// HTML fallback), provided this router is mounted before serveStatic.
//
// This router only PERSISTS campaigns and their assets. Content generation is
// orchestrated by the client against the existing /api/ai/content endpoint —
// there is no new AI surface here.

import { Router } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { requireDashboardAuth } from "../routes";
import { storage } from "../storage";
import {
  createCampaignSchema,
  updateCampaignAssetSchema,
  CAMPAIGN_ASSET_KEYS,
  type CampaignAssetKey,
} from "@shared/schema";

export const campaignsRouter = Router();

// Router-level auth: ANY method/path under /api/admin/campaigns requires the
// dashboard PIN, so unauthenticated requests always get 401 JSON.
campaignsRouter.use(requireDashboardAuth);

campaignsRouter.get("/", async (_req, res) => {
  try {
    const list = await storage.listCampaigns();
    res.json(list);
  } catch {
    res.status(500).json({ message: "Failed to load campaigns." });
  }
});

campaignsRouter.post("/", async (req, res) => {
  try {
    const data = createCampaignSchema.parse(req.body);
    const campaign = await storage.createCampaignFromBlog(data);
    res.status(201).json(campaign);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ message: fromZodError(error).message });
    } else {
      res.status(500).json({ message: "Failed to create campaign." });
    }
  }
});

campaignsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid campaign id." });
  }
  try {
    const campaign = await storage.getCampaign(id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    res.json(campaign);
  } catch {
    res.status(500).json({ message: "Failed to load campaign." });
  }
});

campaignsRouter.patch("/:id/assets/:assetKey", async (req, res) => {
  const id = Number(req.params.id);
  const assetKey = req.params.assetKey;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid campaign id." });
  }
  if (!(CAMPAIGN_ASSET_KEYS as readonly string[]).includes(assetKey)) {
    return res.status(400).json({ message: "Invalid asset key." });
  }
  try {
    const updates = updateCampaignAssetSchema.parse(req.body);
    const row = await storage.updateCampaignAsset(id, assetKey as CampaignAssetKey, updates);
    if (!row) return res.status(404).json({ message: "Asset not found." });
    res.json(row);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ message: fromZodError(error).message });
    } else {
      res.status(500).json({ message: "Failed to update asset." });
    }
  }
});

campaignsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid campaign id." });
  }
  try {
    await storage.deleteCampaign(id);
    res.status(204).end();
  } catch {
    res.status(500).json({ message: "Failed to delete campaign." });
  }
});
