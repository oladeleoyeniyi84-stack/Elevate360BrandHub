// Phase 62 — Worker Runtime
//
// Executes a single task by calling the assigned agent's LLM provider with
// the task's capability. Every call goes through Phase 60 governance first
// (hard blocks + approval gates + per-agent allowlist). Recommendation-only.

import { storage } from "../storage";
import { runTask } from "../ai/modelRouter";
import { evaluateActionSafety } from "../orchestrator/governance";
import { selectBestAgent } from "./agentRegistry";
import { sendAgentMessage } from "./communicationBus";
import type { MeshTask, MeshMission } from "@shared/schema";

const SCRUB: Array<[RegExp, string]> = [
  [/sk-[A-Za-z0-9_\-]{16,}/g, "[redacted:key]"],
  [/Bearer\s+[A-Za-z0-9._\-]{12,}/gi, "[redacted:bearer]"],
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[redacted:email]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted:hex]"],
  [/\b\+?\d[\d\s().\-]{8,}\b/g, "[redacted:phone]"],
];
const scrub = (s: any, max = 2000): string => {
  if (s == null) return "";
  let out = String(s);
  for (const [re, rep] of SCRUB) out = out.replace(re, rep);
  return out.slice(0, max);
};

const MAX_TASK_ATTEMPTS = 2;

export type TaskExecutionResult = {
  status: "succeeded" | "failed" | "blocked" | "requires_approval";
  output: any;
  latencyMs: number;
};

export async function executeTask(taskId: number): Promise<TaskExecutionResult> {
  const task = (await storage.listMeshTasks()).find(t => t.id === taskId);
  if (!task) throw new Error("Task not found");

  // Resolve assigned agent (or pick best on the fly)
  let agentKey: string | null = null;
  if (task.assignedAgentId) {
    const agents = await storage.listMeshAgents();
    agentKey = agents.find(a => a.id === task.assignedAgentId)?.agentKey ?? null;
  }
  if (!agentKey) {
    const a = await selectBestAgent(task.capability);
    if (!a) {
      await storage.updateMeshTask(task.id, { status: "queued", executionOutput: { reason: "no_agent_available" } as any });
      return { status: "failed", output: { reason: "no_agent_available" }, latencyMs: 0 };
    }
    agentKey = a.agentKey;
    await storage.updateMeshTask(task.id, { assignedAgentId: a.id, status: "assigned" });
  }

  // Governance chokepoint (Phase 60)
  const verdict = evaluateActionSafety({ agentKey, capability: task.capability });
  if (verdict.decision !== "allowed") {
    const status = verdict.decision === "requires_founder_approval" ? "requires_approval" : "blocked";
    await storage.updateMeshTask(task.id, {
      status, executionOutput: { decision: verdict.decision, reason: verdict.reason, blockedBy: verdict.blockedBy } as any,
      completedAt: new Date(),
    });
    await storage.createMeshAuditLog({
      missionId: task.missionId, eventType: `task.${status}`,
      summary: `Task '${task.taskKey}' ${status}: ${verdict.reason}`.slice(0, 600), metadata: {} as any,
    });
    return { status, output: { reason: verdict.reason }, latencyMs: 0 };
  }

  const agentRow = await storage.getMeshAgentByKey(agentKey);
  const provider = (agentRow?.provider === "openai" ? "openai" : "deepseek") as "openai" | "deepseek";
  const aiTask = provider === "openai" ? "executive_copy" : "diagnostics";

  await storage.heartbeatMeshAgent(agentKey, "busy");
  await storage.updateMeshTask(task.id, { status: "running", startedAt: new Date(), attemptCount: (task.attemptCount ?? 0) + 1 });

  const t0 = Date.now();
  try {
    const memorySnapshot = await storage.readMeshWorkerMemory(agentKey).catch(() => []);
    const ctx = scrub(JSON.stringify({
      task: task.taskKey, capability: task.capability,
      missionInput: task.executionInput,
      recent_memory: memorySnapshot.slice(0, 5).map(m => ({ scope: m.memoryScope, key: m.memoryKey })),
    }));
    const r = await runTask(aiTask, {
      messages: [
        { role: "system", content: `You are a Senior ${agentRow?.specialization || agentKey} operator. In 4-6 short bullets, deliver: a finding for the requested capability, one safe recommendation, and one risk to watch. Plain English, no JSON.` },
        { role: "user", content: ctx },
      ],
      temperature: 0.3, maxTokens: 380,
    }, { providerOverride: provider });

    const latency = Date.now() - t0;
    const output = { provider: r.provider, model: r.model, content: scrub(r.content, 1600), latencyMs: r.latencyMs };
    await storage.updateMeshTask(task.id, { status: "succeeded", executionOutput: output as any, completedAt: new Date() });
    await storage.recordMeshAgentRun(agentKey, true, latency);
    await storage.writeMeshWorkerMemory({
      agentKey, memoryScope: "task_result", memoryKey: task.taskKey.slice(0, 120),
      memoryValue: { capability: task.capability, summary: output.content.slice(0, 400) } as any, confidence: 60,
    }).catch(() => undefined);
    console.log(`[mesh] task=${task.id} cap=${task.capability} agent=${agentKey} provider=${r.provider} latency=${latency}ms status=succeeded`);
    return { status: "succeeded", output, latencyMs: latency };
  } catch (e: any) {
    const latency = Date.now() - t0;
    const canRetry = (task.attemptCount ?? 0) + 1 < MAX_TASK_ATTEMPTS;
    await storage.updateMeshTask(task.id, {
      status: canRetry ? "queued" : "failed",
      executionOutput: { error: scrub(e?.message, 300) } as any,
      completedAt: canRetry ? null : new Date() as any,
    });
    await storage.recordMeshAgentRun(agentKey, false, latency);
    await storage.createMeshAuditLog({
      missionId: task.missionId, eventType: canRetry ? "task.retry" : "task.failed",
      summary: scrub(`Task ${task.taskKey} failed: ${e?.message}`, 600), metadata: { attempt: (task.attemptCount ?? 0) + 1 } as any,
    });
    console.warn(`[mesh] task=${task.id} cap=${task.capability} agent=${agentKey} status=${canRetry ? "retry" : "failed"} latency=${latency}ms`);
    return { status: "failed", output: { error: "task_failed" }, latencyMs: latency };
  }
}

/**
 * Persist a final mission status only if the mission hasn't been cancelled.
 * Cancellation set via `cancelMission` is authoritative — we must not clobber
 * it with a downstream "completed" / "failed" write.
 */
async function setFinalMissionStatus(
  missionId: number,
  patch: Partial<MeshMission> & { status: string },
): Promise<MeshMission> {
  const current = await storage.getMeshMission(missionId);
  if (current && current.status === "cancelled") return current;
  return storage.updateMeshMission(missionId, patch as any);
}

export type MissionExecutionOutcome = {
  mission: MeshMission;
  /** Terminal status to apply to the queue entry. */
  queueStatus: "completed" | "failed" | "blocked" | "pending_approval" | "cancelled" | "retrying";
};

export async function executeMission(missionId: number): Promise<MissionExecutionOutcome> {
  const claimed = await storage.claimMeshMission(missionId);
  if (!claimed) {
    const current = await storage.getMeshMission(missionId);
    if (!current) throw new Error("Mission not found");
    // Already claimed by another tick (or cancelled). Skip re-execution.
    return { mission: current, queueStatus: current.status === "cancelled" ? "cancelled" : "completed" };
  }

  await storage.createMeshAuditLog({ missionId, eventType: "mission.started", summary: `Mission '${claimed.title}' started.`, metadata: {} as any });

  const tasks = await storage.listMeshTasks(missionId);
  const sorted = tasks.slice().sort((a, b) => a.executionOrder - b.executionOrder);
  const results: Array<{ taskKey: string; status: string; content?: string }> = [];

  for (const t of sorted) {
    // Cooperative cancellation check before each task.
    const live = await storage.getMeshMission(missionId);
    if (live && live.status === "cancelled") {
      await storage.createMeshAuditLog({ missionId, eventType: "mission.cancelled_midflight", summary: `Aborted before ${t.taskKey}.`, metadata: {} as any });
      return { mission: live, queueStatus: "cancelled" };
    }
    const r = await executeTask(t.id);
    results.push({ taskKey: t.taskKey, status: r.status, content: r.output?.content });
    if (r.status === "blocked" || r.status === "requires_approval") {
      const finalStatus = r.status === "requires_approval" ? "pending_approval" : "blocked";
      const updated = await setFinalMissionStatus(missionId, {
        status: finalStatus, completedAt: new Date(),
        resultSummary: `Halted at ${t.taskKey}: ${(r.output as any)?.reason || finalStatus}`.slice(0, 1000),
      });
      await storage.createMeshAuditLog({ missionId, eventType: `mission.${finalStatus}`, summary: updated.resultSummary, metadata: {} as any });
      return { mission: updated, queueStatus: finalStatus as any };
    }
  }

  // Re-read tasks: any that came back as queued indicate a retry was scheduled.
  const post = await storage.listMeshTasks(missionId);
  const retryPending = post.filter(p => p.status === "queued");
  if (retryPending.length > 0) {
    const retrying = await setFinalMissionStatus(missionId, {
      status: "retrying", attemptCount: (claimed.attemptCount ?? 0) + 1,
      resultSummary: `Awaiting retry on ${retryPending.length} task(s).`,
    });
    await storage.createMeshAuditLog({ missionId, eventType: "mission.retrying", summary: retrying.resultSummary, metadata: { pendingTasks: retryPending.length } as any });
    return { mission: retrying, queueStatus: "retrying" };
  }

  const failedCount = results.filter(r => r.status === "failed").length;
  const finalStatus = failedCount === results.length ? "failed" : (failedCount > 0 ? "completed_with_failures" : "completed");
  const summary = results.map(r => `${r.taskKey}=${r.status}`).join("; ").slice(0, 1000);
  const updated = await setFinalMissionStatus(missionId, {
    status: finalStatus, completedAt: new Date(), resultSummary: summary, confidence: failedCount === 0 ? 80 : 50,
  });
  await storage.createMeshAuditLog({ missionId, eventType: `mission.${finalStatus}`, summary, metadata: { failed: failedCount, total: results.length } as any });

  await sendAgentMessage({
    fromAgentKey: null, toAgentKey: "executive_worker",
    communicationType: "mission.completed",
    payload: { missionId, status: finalStatus, taskCount: results.length, failed: failedCount } as any,
  }).catch(() => undefined);

  const queueStatus = updated.status === "cancelled" ? "cancelled" : (finalStatus === "failed" ? "failed" : "completed");
  return { mission: updated, queueStatus: queueStatus as any };
}
