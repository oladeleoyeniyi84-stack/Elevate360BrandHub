// Phase 62 — Agent Registry
//
// The single source of truth for the 9 distributed worker agents. On boot
// we upsert their definitions into `mesh_agents` (idempotent). At dispatch
// time `selectBestAgent` picks the lowest-load idle worker that has the
// requested capability AND has cleared its cooldown.

import { storage } from "../storage";
import type { InsertMeshAgent, MeshAgent } from "@shared/schema";

export type WorkerDefinition = {
  agentKey: string;
  displayName: string;
  specialization: string;
  provider: "deepseek" | "openai";
  capabilities: string[];
  maxConcurrency: number;
  cooldownSeconds: number;
};

export const WORKER_DEFINITIONS: WorkerDefinition[] = [
  { agentKey: "growth_worker",          displayName: "Growth Worker",          specialization: "Funnel & acquisition diagnostics", provider: "deepseek", capabilities: ["analyze.growth","analyze.funnel","recommend.growth","propose.experiment"], maxConcurrency: 2, cooldownSeconds: 60 },
  { agentKey: "revenue_worker",         displayName: "Revenue Worker",         specialization: "Revenue analysis & forecasting",   provider: "deepseek", capabilities: ["analyze.revenue","analyze.forecast","recommend.revenue","propose.pricing"], maxConcurrency: 2, cooldownSeconds: 60 },
  { agentKey: "experiment_worker",      displayName: "Experiment Worker",      specialization: "A/B experiment design + readout",  provider: "deepseek", capabilities: ["propose.experiment","evaluate.experiment","rollback.experiment"], maxConcurrency: 2, cooldownSeconds: 90 },
  { agentKey: "personalization_worker", displayName: "Personalization Worker", specialization: "Segment & personalization plans",  provider: "deepseek", capabilities: ["analyze.segments","propose.personalization","evaluate.personalization"], maxConcurrency: 2, cooldownSeconds: 90 },
  { agentKey: "reliability_worker",     displayName: "Reliability Worker",     specialization: "QA, errors, recovery",             provider: "deepseek", capabilities: ["analyze.health","analyze.errors","recommend.recovery"], maxConcurrency: 2, cooldownSeconds: 30 },
  { agentKey: "content_worker",         displayName: "Content Worker",         specialization: "Editorial review & content drafts",provider: "deepseek", capabilities: ["analyze.content","propose.content"], maxConcurrency: 2, cooldownSeconds: 120 },
  { agentKey: "executive_worker",       displayName: "Executive Worker",       specialization: "Founder-facing synthesis",         provider: "openai",   capabilities: ["synthesize.executive","summarize.workflow","summarize.mission"], maxConcurrency: 1, cooldownSeconds: 60 },
  { agentKey: "strategy_worker",        displayName: "Strategy Worker",        specialization: "Cross-domain strategic analysis",  provider: "openai",   capabilities: ["analyze.strategy","recommend.strategy","summarize.workflow"], maxConcurrency: 1, cooldownSeconds: 120 },
  { agentKey: "automation_worker",      displayName: "Automation Worker",      specialization: "Job health & automation recovery", provider: "deepseek", capabilities: ["analyze.automation","recommend.recovery","summarize.workflow"], maxConcurrency: 2, cooldownSeconds: 60 },
];

export async function seedDefaultAgents(): Promise<void> {
  for (const def of WORKER_DEFINITIONS) {
    const input: InsertMeshAgent = {
      agentKey: def.agentKey, displayName: def.displayName,
      specialization: def.specialization, provider: def.provider,
      status: "idle", maxConcurrency: def.maxConcurrency,
      cooldownSeconds: def.cooldownSeconds, capabilities: def.capabilities as any,
      metadata: {} as any,
    };
    await storage.upsertMeshAgent(input).catch(e => console.warn("[mesh] seed agent failed:", def.agentKey, e?.message));
  }
}

export async function registerExecutionAgent(input: InsertMeshAgent): Promise<MeshAgent> {
  return storage.upsertMeshAgent(input);
}

export async function heartbeatAgent(agentKey: string, status?: string): Promise<void> {
  await storage.heartbeatMeshAgent(agentKey, status);
}

export async function listAgents(status?: string): Promise<MeshAgent[]> {
  return storage.listMeshAgents(status);
}

/**
 * Concurrency- and cooldown-aware selector. Picks the idle worker with the
 * matching capability, lowest avg latency, and a cleared cooldown window.
 */
export async function selectBestAgent(capability: string): Promise<MeshAgent | null> {
  const agents = await storage.listMeshAgents();
  const cap = capability.toLowerCase();
  const now = Date.now();
  const candidates = agents.filter(a => {
    if (a.status === "offline") return false;
    const caps = (a.capabilities || []).map(c => c.toLowerCase());
    const matches = caps.some(c => cap === c || cap.startsWith(c + "."));
    if (!matches) return false;
    if (a.lastBusyAt && now - new Date(a.lastBusyAt).getTime() < a.cooldownSeconds * 1000) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.status !== b.status) return a.status === "idle" ? -1 : 1;
    return a.averageLatencyMs - b.averageLatencyMs;
  });
  return candidates[0];
}
