import type { VerificationCheckResult, VerificationResult } from "@iamrobot/protocol";

export interface VerificationCheckSummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}

export function summarizeVerificationChecks(
  checks: readonly VerificationCheckResult[],
): VerificationCheckSummary {
  return checks.reduce<VerificationCheckSummary>(
    (summary, check) => ({
      total: summary.total + 1,
      passed: summary.passed + Number(check.status === "passed"),
      failed: summary.failed + Number(check.status === "failed"),
      skipped: summary.skipped + Number(check.status === "skipped"),
    }),
    {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
  );
}

export function didVerificationPass(
  checks: readonly VerificationCheckResult[],
): checks is readonly VerificationCheckResult[] {
  return checks.every((check) => check.status !== "failed");
}

export function getFailedVerificationChecks(
  checks: readonly VerificationCheckResult[],
): readonly VerificationCheckResult[] {
  return checks.filter((check) => check.status === "failed");
}

export function formatVerificationSummary(
  input: VerificationResult | readonly VerificationCheckResult[],
): string {
  const checks = getVerificationChecks(input);
  const summary = summarizeVerificationChecks(checks);
  const status = getVerificationStatus(input, checks);

  return `${status}: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`;
}

function getVerificationChecks(
  input: VerificationResult | readonly VerificationCheckResult[],
): readonly VerificationCheckResult[] {
  return isVerificationResult(input) ? input.checks : input;
}

function getVerificationStatus(
  input: VerificationResult | readonly VerificationCheckResult[],
  checks: readonly VerificationCheckResult[],
): VerificationResult["status"] {
  return isVerificationResult(input)
    ? input.status
    : didVerificationPass(checks)
      ? "passed"
      : "failed";
}

function isVerificationResult(
  input: VerificationResult | readonly VerificationCheckResult[],
): input is VerificationResult {
  return !Array.isArray(input);
}
