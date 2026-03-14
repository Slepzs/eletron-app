import type {
  AgentRole,
  FailureContext,
  Run,
  StructuredHandoff,
  Verdict,
  VerificationResult,
} from "@iamrobot/protocol";
import { getStructuredHandoffSection } from "@iamrobot/protocol";
import { formatVerificationSummary, getFailedVerificationChecks } from "@iamrobot/verification";

interface CreateRetryVerdictInput {
  readonly summary: string;
  readonly blockingIssues: readonly string[];
  readonly proposedNextAction: string | null;
  readonly attemptsRemaining: boolean;
  readonly failureContext?: FailureContext;
}

export function createAcceptedVerdict(result: VerificationResult): Verdict {
  return {
    status: "accepted",
    summary: `Verification passed. ${formatVerificationSummary(result)}.`,
    blockingIssues: [],
    proposedNextAction: null,
    confidence: 0.86,
  };
}

export function createReviewVerdict(reviewHandoff: StructuredHandoff, run: Run): Verdict | null {
  const requestedAction = normalizeSectionValue(
    getStructuredHandoffSection(reviewHandoff, "REQUESTED_ACTION"),
  );

  if (!requestedAction || requestedAction === "None.") {
    return null;
  }

  return createRetryVerdict({
    summary: "Reviewer requested another implementation pass.",
    blockingIssues: collectBlockingIssues(reviewHandoff),
    proposedNextAction: requestedAction,
    attemptsRemaining: run.currentAttempt < run.maxAttempts,
  });
}

export function createVerificationFailureVerdict(result: VerificationResult, run: Run): Verdict {
  const failedChecks = getFailedVerificationChecks(result.checks);
  const blockingIssues = failedChecks.map((check) => `${check.kind}: ${check.summary}`);

  return createRetryVerdict({
    summary: `Verification failed. ${formatVerificationSummary(result)}.`,
    blockingIssues,
    proposedNextAction:
      failedChecks.length === 0
        ? "Investigate the verification failure and retry."
        : `Fix the failing verification checks: ${failedChecks.map((check) => check.kind).join(", ")}.`,
    attemptsRemaining: run.currentAttempt < run.maxAttempts,
  });
}

export function createStageFailureVerdict(input: {
  readonly run: Run;
  readonly stage: Run["stage"];
  readonly role: AgentRole;
  readonly error: Error;
  readonly failureContext?: FailureContext;
}): Verdict {
  const stageLabel =
    input.stage === "planning"
      ? "Planning"
      : input.stage === "implementing"
        ? "Implementation"
        : input.stage === "reviewing"
          ? "Review"
          : "Verification";

  return createRetryVerdict({
    summary: `${stageLabel} failed: ${input.error.message}`,
    blockingIssues: [input.error.message],
    proposedNextAction: `Retry ${input.stage} after addressing the failure.`,
    attemptsRemaining: input.run.currentAttempt < input.run.maxAttempts,
    ...(input.failureContext !== undefined ? { failureContext: input.failureContext } : {}),
  });
}

export function createCancelledVerdict(): Verdict {
  return {
    status: "rejected",
    summary: "Run cancelled.",
    blockingIssues: ["The run was cancelled before completion."],
    proposedNextAction: null,
    confidence: 1,
  };
}

function createRetryVerdict(input: CreateRetryVerdictInput): Verdict {
  const base = {
    blockingIssues: input.blockingIssues,
    proposedNextAction: input.proposedNextAction,
    ...(input.failureContext !== undefined ? { failureContext: input.failureContext } : {}),
  };

  if (input.attemptsRemaining) {
    return {
      status: "needs_retry",
      summary: input.summary,
      confidence: 0.58,
      ...base,
    };
  }

  return {
    status: "rejected",
    summary: `${input.summary} Maximum attempts reached.`,
    confidence: 0.73,
    ...base,
  };
}

function collectBlockingIssues(reviewHandoff: StructuredHandoff): readonly string[] {
  const risks = normalizeSectionValue(getStructuredHandoffSection(reviewHandoff, "RISKS"));
  const requestedAction = normalizeSectionValue(
    getStructuredHandoffSection(reviewHandoff, "REQUESTED_ACTION"),
  );
  const issues = [risks, requestedAction].filter(
    (value): value is string => value !== undefined && value !== "None.",
  );

  return issues.length > 0 ? issues : ["Reviewer requested follow-up work."];
}

function normalizeSectionValue(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}
