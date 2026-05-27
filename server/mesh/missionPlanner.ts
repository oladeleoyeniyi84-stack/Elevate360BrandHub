// Phase 62 — Mission Planner
//
// Builds a mission and decomposes it into a small ordered list of tasks.
// Recommendation-only: nothing here triggers business mutations.

import { storage } from "../storage";
import type { InsertMeshMission, InsertMeshTask, MeshMission, MeshTask } from "@shared/schema";

export type PlanInput = {
  title: string;
  objective: string;
  workflowOrigin?: string;
  parentMissionId?: number | null;
  priority?: number;
  capabilities?: string[];        // ordered task plan
  missionContext?: Record<string, any>;
  missionKey?: string;            // for idempotent enqueues
};

export function assignMissionPriority(workflowOrigin: string | undefined, hint?: number): number {
  if (typeof hint === "number" && hint >= 0 && hint <= 100) return Math.round(hint);
  switch ((workflowOrigin || "").toLowerCase()) {
    case "critical": case "incident": return 95;
    case "revenue": case "growth":     return 75;
    case "experiment":                 return 60;
    case "content":                    return 30;
    default:                           return 50;
  }
}

export function buildExecutionPlan(capabilities: string[]): Array<{ taskKey: string; capability: string; executionOrder: number }> {
  return capabilities.map((cap, i) => ({
    taskKey: `${cap.replace(/[^a-z0-9_.-]/gi, "_").slice(0, 60)}_${i + 1}`,
    capability: cap, executionOrder: i + 1,
  }));
}

export async function createMission(input: PlanInput): Promise<{ mission: MeshMission; tasks: MeshTask[] }> {
  const caps = (input.capabilities && input.capabilities.length > 0)
    ? input.capabilities
    : ["analyze.health", "synthesize.executive"];
  const plan = buildExecutionPlan(caps);
  const missionKey = input.missionKey
    ?? `mission_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const missionInput: InsertMeshMission = {
    missionKey: missionKey.slice(0, 120),
    title: input.title.slice(0, 200),
    objective: (input.objective || "").slice(0, 4000),
    priority: assignMissionPriority(input.workflowOrigin, input.priority),
    status: "queued",
    assignedAgentId: null as any,
    parentMissionId: (input.parentMissionId ?? null) as any,
    workflowOrigin: (input.workflowOrigin || "manual").slice(0, 80),
    executionPlan: { steps: plan } as any,
    missionContext: (input.missionContext ?? {}) as any,
    resultSummary: "",
    confidence: 50,
  };
  const mission = await storage.createMeshMission(missionInput);
  const tasks: MeshTask[] = [];
  for (const step of plan) {
    const tInput: InsertMeshTask = {
      missionId: mission.id, taskKey: step.taskKey, capability: step.capability,
      assignedAgentId: null as any, executionOrder: step.executionOrder, status: "queued",
      executionInput: {} as any, executionOutput: {} as any,
    };
    tasks.push(await storage.createMeshTask(tInput));
  }
  await storage.createMeshAuditLog({
    missionId: mission.id, eventType: "mission.created",
    summary: `Mission '${mission.title}' created with ${tasks.length} task(s).`,
    metadata: { plan } as any,
  });
  return { mission, tasks };
}

export async function splitMissionIntoTasks(missionId: number, extraCapabilities: string[]): Promise<MeshTask[]> {
  const out: MeshTask[] = [];
  const existing = await storage.listMeshTasks(missionId);
  let order = existing.length;
  for (const cap of extraCapabilities) {
    order += 1;
    out.push(await storage.createMeshTask({
      missionId, taskKey: `${cap}_${order}`, capability: cap,
      assignedAgentId: null as any, executionOrder: order, status: "queued",
      executionInput: {} as any, executionOutput: {} as any,
    }));
  }
  return out;
}
