import { storage } from "../storage";
import { resolveExecutionDecision } from "../services/executionPolicy";

function changeKey(area: string, type: string, target: string) {
  return `${area}:${type}:${target}:${Date.now()}`;
}

export async function runExecutionEngine(): Promise<{ applied: number; queued: number; skipped: number }> {
  let applied = 0;
  let queued = 0;
  let skipped = 0;

  // 1. Process approved experiments
  const approvedExps = await storage.getApprovedExperimentsReadyForExecution();
  for (const exp of approvedExps) {
    const decision = await resolveExecutionDecision("experiment", exp.expectedImpactScore, 20);

    if (decision.canAutoApply) {
      await storage.createAppliedChange({
        changeKey: changeKey("experiment", "launch_experiment", String(exp.id)),
        area: "experiment",
        targetType: "growth_experiment",
        targetId: String(exp.id),
        changeType: "launch_experiment",
        beforeJson: { status: exp.status },
        afterJson: { status: "running" },
        reason: `Auto-launched experiment: ${exp.title}`,
        evidenceJson: { hypothesis: exp.hypothesis, expectedImpact: exp.expectedImpactScore },
        confidence: exp.expectedImpactScore,
        riskScore: 20,
        status: "applied",
        appliedBy: "ai",
        appliedAt: new Date(),
      });
      await storage.updateGrowthExperiment(exp.id, { status: "running", startedAt: new Date() });
      applied++;
    } else if (decision.requiresApproval) {
      await storage.createExecutionQueueItem({
        queueKey: `exp:${exp.id}:${Date.now()}`,
        area: "experiment",
        actionType: "launch_experiment",
        payloadJson: { experimentId: exp.id, title: exp.title, hypothesis: exp.hypothesis },
        priorityScore: exp.expectedImpactScore,
        status: "pending",
        requiresApproval: true,
      }).catch(() => null);
      queued++;
    } else {
      skipped++;
    }
  }

  // 2. Process safe offer override candidates
  const overrideCandidates = await storage.getSafeOverrideCandidates();
  for (const candidate of overrideCandidates.slice(0, 3)) {
    if (!candidate.intent || !candidate.offerSlug) continue;
    const decision = await resolveExecutionDecision("offer", candidate.performanceScore, 15);
    const key = changeKey("offer", "promote_override", `${candidate.intent}:${candidate.offerSlug}`);

    if (decision.canAutoApply) {
      await storage.createAppliedChange({
        changeKey: key,
        area: "offer",
        targetType: "offer_mapping",
        targetId: candidate.intent,
        changeType: "promote_override",
        beforeJson: { intent: candidate.intent },
        afterJson: { intent: candidate.intent, offerSlug: candidate.offerSlug },
        reason: `High-performing offer ${candidate.offerSlug} auto-promoted for intent: ${candidate.intent}`,
        evidenceJson: { performanceScore: candidate.performanceScore, acceptedCount: candidate.acceptedCount },
        confidence: candidate.performanceScore,
        riskScore: 15,
        status: "applied",
        appliedBy: "ai",
        appliedAt: new Date(),
      });
      applied++;
    } else {
      await storage.createExecutionQueueItem({
        queueKey: key,
        area: "offer",
        actionType: "promote_override",
        payloadJson: { intent: candidate.intent, offerSlug: candidate.offerSlug, performanceScore: candidate.performanceScore },
        priorityScore: candidate.performanceScore,
        status: "pending",
        requiresApproval: true,
      }).catch(() => null);
      queued++;
    }
  }

  // 3. CTA placement candidates
  const ctaCandidates = await storage.getSafeCtaCandidates();
  for (const cta of ctaCandidates.slice(0, 2)) {
    const decision = await resolveExecutionDecision("cta", 72, cta.severityScore ?? 20);
    const key = changeKey("cta", "optimize_cta_placement", cta.stage ?? "unknown");

    if (decision.canAutoApply) {
      await storage.createAppliedChange({
        changeKey: key,
        area: "cta",
        targetType: "funnel_stage",
        targetId: cta.stage ?? "unknown",
        changeType: "optimize_cta_placement",
        beforeJson: { stage: cta.stage, dropoffRate: cta.dropoffRate },
        afterJson: { stage: cta.stage, fix: cta.recommendedFix },
        reason: `CTA optimized for high-dropoff stage: ${cta.stage}`,
        evidenceJson: { severityScore: cta.severityScore, dropoffRate: cta.dropoffRate },
        confidence: 72,
        riskScore: cta.severityScore ?? 20,
        status: "applied",
        appliedBy: "ai",
        appliedAt: new Date(),
      });
      applied++;
    } else {
      await storage.createExecutionQueueItem({
        queueKey: key,
        area: "cta",
        actionType: "optimize_cta_placement",
        payloadJson: cta,
        priorityScore: cta.severityScore ?? 30,
        status: "pending",
        requiresApproval: true,
      }).catch(() => null);
      queued++;
    }
  }

  // 4. Links priority candidates
  const linksCandidates = await storage.getLinksPriorityCandidates();
  if (linksCandidates.length > 0) {
    const decision = await resolveExecutionDecision("links", 85, 10);
    const key = changeKey("links", "reorder_priority", "homepage");
    if (decision.canAutoApply) {
      await storage.createAppliedChange({
        changeKey: key,
        area: "links",
        targetType: "links_page",
        targetId: "homepage",
        changeType: "reorder_priority",
        beforeJson: { order: "default" },
        afterJson: { topProducts: linksCandidates.slice(0, 5).map((l) => l.product) },
        reason: "Links reordered by click performance",
        evidenceJson: { candidates: linksCandidates.slice(0, 5) },
        confidence: 85,
        riskScore: 10,
        status: "applied",
        appliedBy: "ai",
        appliedAt: new Date(),
      });
      applied++;
    } else {
      await storage.createExecutionQueueItem({
        queueKey: key,
        area: "links",
        actionType: "reorder_priority",
        payloadJson: { topProducts: linksCandidates.slice(0, 5) },
        priorityScore: 60,
        status: "pending",
        requiresApproval: decision.requiresApproval,
      }).catch(() => null);
      queued++;
    }
  }

  console.log(`[executionEngine] applied=${applied} queued=${queued} skipped=${skipped}`);
  return { applied, queued, skipped };
}
