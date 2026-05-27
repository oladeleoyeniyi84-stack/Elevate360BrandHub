// Phase 62 — Topology Engine
//
// Builds and persists a snapshot of the current mesh: agent map, mission
// pipeline, recent comms graph. Pure read; never mutates business state.

import { storage } from "../storage";
import type { MeshTopologySnapshot } from "@shared/schema";

export async function calculateMeshHealth(): Promise<number> {
  const s = await storage.getMeshStats();
  const totalCompleted = s.completedMissions24h + s.failedMissions24h;
  const successRate = totalCompleted === 0 ? 80 : Math.round((s.completedMissions24h / totalCompleted) * 100);
  const agentBase = s.idleAgents + s.busyAgents > 0 ? 100 : 40;
  const backpressurePenalty = Math.min(40, s.queuedMissions * 4);
  const failurePenalty = Math.min(30, s.failedMissions24h * 6);
  return Math.max(0, Math.min(100, Math.round((successRate * 0.5) + (agentBase * 0.5) - backpressurePenalty - failurePenalty)));
}

export async function buildTopologySnapshot(): Promise<MeshTopologySnapshot> {
  const [agents, missions, tasks, comms, stats] = await Promise.all([
    storage.listMeshAgents(),
    storage.listMeshMissions(undefined, 25),
    storage.listMeshTasks(undefined, 100),
    storage.listMeshCommunications(50),
    storage.getMeshStats(),
  ]);

  const meshHealth = await calculateMeshHealth();

  const nodes = agents.map(a => ({
    id: a.agentKey, label: a.displayName, specialization: a.specialization,
    provider: a.provider, status: a.status, totalRuns: a.totalRuns,
    successRate: a.totalRuns > 0 ? Math.round((a.successfulRuns / a.totalRuns) * 100) : null,
    averageLatencyMs: a.averageLatencyMs,
  }));

  const agentById = new Map(agents.map(a => [a.id, a.agentKey]));
  const edges = comms
    .filter(c => c.fromAgentId && c.toAgentId)
    .map(c => ({ from: agentById.get(c.fromAgentId!), to: agentById.get(c.toAgentId!), type: c.communicationType }))
    .filter(e => e.from && e.to);

  const pipeline = {
    queued: missions.filter(m => m.status === "queued").length,
    assigned: missions.filter(m => m.status === "assigned").length,
    running: missions.filter(m => m.status === "running").length,
    completed: missions.filter(m => m.status === "completed" || m.status === "completed_with_failures").length,
    failed: missions.filter(m => m.status === "failed").length,
    blocked: missions.filter(m => m.status === "blocked" || m.status === "pending_approval").length,
  };

  const topology = { nodes, edges, pipeline, recentTasks: tasks.slice(0, 30).map(t => ({ id: t.id, mission: t.missionId, cap: t.capability, status: t.status })) };

  return storage.createMeshTopologySnapshot({
    activeAgents: stats.idleAgents + stats.busyAgents,
    runningMissions: stats.runningMissions,
    queuedMissions: stats.queuedMissions,
    failedMissions: stats.failedMissions24h,
    meshHealthScore: meshHealth,
    topology: topology as any,
  });
}

export async function latestTopology(): Promise<MeshTopologySnapshot | null> {
  return storage.getLatestMeshTopologySnapshot();
}
