import { storage } from "../storage";
import { evaluateExperimentOutcome } from "../services/experimentEvaluator";

const DEGRADATION_THRESHOLD = -15;

export async function runRollbackEngine(): Promise<{ checked: number; rolledBack: number; won: number; inconclusive: number }> {
  let checked = 0;
  let rolledBack = 0;
  let won = 0;
  let inconclusive = 0;

  const appliedChanges = await storage.getAppliedChanges(50);
  const recent = appliedChanges.filter(
    (c) => c.status === "applied" && c.appliedAt && Date.now() - c.appliedAt.getTime() > 24 * 60 * 60 * 1000
  );

  for (const change of recent) {
    checked++;
    try {
      const outcome = await evaluateExperimentOutcome(change.changeKey);

      if (outcome.status === "lost") {
        await storage.createRollbackEvent({
          appliedChangeId: change.id,
          reason: outcome.verdict,
          metricsBeforeJson: change.beforeJson as any,
          metricsAfterJson: outcome.metrics,
          status: "triggered",
        });
        await storage.updateAppliedChange(change.id, { status: "rolled_back", rolledBackAt: new Date() });
        rolledBack++;
        console.log(`[rollbackEngine] rolled back: ${change.changeKey} — ${outcome.verdict}`);
      } else if (outcome.status === "won") {
        await storage.updateAppliedChange(change.id, { status: "applied" });
        won++;
      } else {
        inconclusive++;
      }
    } catch (err: any) {
      console.warn(`[rollbackEngine] error evaluating ${change.changeKey}: ${err?.message}`);
    }
  }

  console.log(`[rollbackEngine] checked=${checked} rolledBack=${rolledBack} won=${won} inconclusive=${inconclusive}`);
  return { checked, rolledBack, won, inconclusive };
}
