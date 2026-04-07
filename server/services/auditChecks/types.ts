export type CheckStatus = "pass" | "warning" | "fail";
export type CheckSeverity = "critical" | "high" | "medium" | "low";

export interface CheckResult {
  checkKey: string;
  checkGroup: string;
  title: string;
  severity: CheckSeverity;
  status: CheckStatus;
  expectedValue: string;
  actualValue: string;
  detailsJson?: Record<string, unknown>;
}
