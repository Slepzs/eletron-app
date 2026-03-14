import type {
  StructuredHandoff,
  Task,
  VerificationCheckResult,
  VerificationResult,
} from "@iamrobot/protocol";
import { getStructuredHandoffSection } from "@iamrobot/protocol";
import { formatVerificationSummary, getFailedVerificationChecks } from "@iamrobot/verification";

interface BuildPlanningPromptInput {
  readonly task: Task;
}

interface BuildImplementationPromptInput {
  readonly task: Task;
  readonly planningHandoff: StructuredHandoff | undefined;
  readonly latestImplementationHandoff: StructuredHandoff | undefined;
  readonly latestReviewHandoff: StructuredHandoff | undefined;
  readonly latestVerificationResult: VerificationResult | undefined;
  readonly retryReason: string | undefined;
}

interface BuildReviewPromptInput {
  readonly task: Task;
  readonly planningHandoff: StructuredHandoff | undefined;
  readonly implementationHandoff: StructuredHandoff | undefined;
}

export function buildPlanningPrompt(input: BuildPlanningPromptInput): string {
  return [
    `You are the planning agent for task ${input.task.taskId}.`,
    "Create a concrete implementation plan for the implementer.",
    "Do not modify files or run destructive commands.",
    "",
    formatTaskSection(input.task),
    "",
    "Focus on:",
    "- the minimal implementation path",
    "- explicit assumptions",
    "- risks or edge cases the implementer should watch",
    "- what the reviewer should verify",
  ].join("\n");
}

export function buildImplementationPrompt(input: BuildImplementationPromptInput): string {
  const sections = [
    `You are the implementation agent for task ${input.task.taskId}.`,
    "Make the code changes needed for the task.",
    "Keep edits inside the allowed paths when they are provided.",
    "",
    formatTaskSection(input.task),
    createHandoffContext("Planner handoff", input.planningHandoff),
    createHandoffContext("Previous implementation handoff", input.latestImplementationHandoff),
    createHandoffContext("Latest review handoff", input.latestReviewHandoff),
    createVerificationContext(input.latestVerificationResult),
    input.retryReason ? `Retry reason:\n${input.retryReason}` : undefined,
    "Implementation notes:",
    "- preserve existing types and reuse exported contracts",
    "- avoid unrelated refactors",
    "- mention any remaining risks or follow-up work in the handoff",
  ];

  return sections.filter(isDefined).join("\n\n");
}

export function buildReviewPrompt(input: BuildReviewPromptInput): string {
  return [
    `You are the review agent for task ${input.task.taskId}.`,
    "Review the current worktree state and the implementation handoff.",
    "Do not modify files. Focus on correctness, regressions, missing tests, and policy issues.",
    "",
    formatTaskSection(input.task),
    createHandoffContext("Planner handoff", input.planningHandoff),
    createHandoffContext("Implementation handoff", input.implementationHandoff),
    "",
    "If implementation changes are required, set REQUESTED_ACTION to a concise retry instruction.",
    "If the work is ready for verification, set REQUESTED_ACTION to `None.`.",
  ]
    .filter(isDefined)
    .join("\n");
}

function formatTaskSection(task: Task): string {
  return [
    "Task context:",
    `- Goal: ${task.goal}`,
    `- Base branch: ${task.baseBranch}`,
    `- Verification profile: ${task.verificationProfile}`,
    formatStringList("Constraints", task.constraints),
    formatStringList("Acceptance criteria", task.acceptanceCriteria),
    formatStringList("Allowed paths", task.allowedPaths),
  ].join("\n");
}

function createHandoffContext(
  label: string,
  handoff: StructuredHandoff | undefined,
): string | undefined {
  if (!handoff) {
    return undefined;
  }

  return [
    `${label}:`,
    formatHandoffSection("PLAN", getStructuredHandoffSection(handoff, "PLAN")),
    formatHandoffSection("ASSUMPTIONS", getStructuredHandoffSection(handoff, "ASSUMPTIONS")),
    formatHandoffSection("CHANGES", getStructuredHandoffSection(handoff, "CHANGES")),
    formatHandoffSection("RISKS", getStructuredHandoffSection(handoff, "RISKS")),
    formatHandoffSection(
      "REQUESTED_ACTION",
      getStructuredHandoffSection(handoff, "REQUESTED_ACTION"),
    ),
  ].join("\n");
}

function createVerificationContext(result: VerificationResult | undefined): string | undefined {
  if (!result) {
    return undefined;
  }

  const failedChecks = getFailedVerificationChecks(result.checks);

  return [
    "Latest verification result:",
    formatVerificationSummary(result),
    failedChecks.length > 0 ? formatFailedChecks(failedChecks) : "No failed checks.",
  ].join("\n");
}

function formatFailedChecks(checks: readonly VerificationCheckResult[]): string {
  return ["Failed checks:", ...checks.map((check) => `- ${check.kind}: ${check.summary}`)].join(
    "\n",
  );
}

function formatHandoffSection(label: string, value: string | undefined): string {
  return `${label}:\n${value?.trim() || "None."}`;
}

function formatStringList(label: string, values: readonly string[]): string {
  if (values.length === 0) {
    return `- ${label}: None.`;
  }

  return [`- ${label}:`, ...values.map((value) => `  - ${value}`)].join("\n");
}

function isDefined(value: string | undefined): value is string {
  return value !== undefined;
}
