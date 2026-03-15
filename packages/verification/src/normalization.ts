import type { VerificationCheckResult, VerificationResult } from "@iamrobot/protocol";

import type {
  CreateVerificationResultInput,
  VerificationCommand,
  VerificationCommandExecutionResult,
} from "./types.js";

const SUMMARY_PREVIEW_LENGTH = 160;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matches ANSI escape sequences
const ANSI_CODE_PATTERN = /\u001B\[[0-9;]*m/g;

export function createVerificationResult(input: CreateVerificationResultInput): VerificationResult {
  return {
    verificationResultId: input.verificationResultId,
    runId: input.runId,
    status: getVerificationResultStatus(input.checks),
    checks: input.checks,
    completedAt: input.completedAt,
  };
}

export function normalizeVerificationCheckResult(
  command: VerificationCommand,
  execution: VerificationCommandExecutionResult,
): VerificationCheckResult {
  const status = getNormalizedCheckStatus(command, execution);

  return {
    kind: command.kind,
    status,
    command: command.command,
    summary: createExecutionSummary(command, execution, status),
  };
}

export function createSkippedVerificationCheckResult(
  command: VerificationCommand,
  reason: string,
): VerificationCheckResult {
  return {
    kind: command.kind,
    status: "skipped",
    command: command.command,
    summary: reason,
  };
}

export function getVerificationResultStatus(
  checks: readonly VerificationCheckResult[],
): VerificationResult["status"] {
  return checks.some((check) => check.status === "failed") ? "failed" : "passed";
}

function getNormalizedCheckStatus(
  command: VerificationCommand,
  execution: VerificationCommandExecutionResult,
): VerificationCheckResult["status"] {
  if (execution.exitCode === 0 && !execution.error) {
    return "passed";
  }

  return command.required ? "failed" : "skipped";
}

function createExecutionSummary(
  command: VerificationCommand,
  execution: VerificationCommandExecutionResult,
  status: VerificationCheckResult["status"],
): string {
  if (status === "passed") {
    return `Passed in ${formatDuration(execution.durationMs)}.`;
  }

  const details = getExecutionFailureDetails(execution);

  if (status === "skipped") {
    if (command.required) {
      return `Skipped after ${formatDuration(execution.durationMs)}. ${details}`;
    }

    return `Optional check failed after ${formatDuration(execution.durationMs)} and was skipped. ${details}`;
  }

  return `Failed after ${formatDuration(execution.durationMs)}. ${details}`;
}

function getExecutionFailureDetails(execution: VerificationCommandExecutionResult): string {
  if (execution.error) {
    return `Execution error: ${execution.error.message}.`;
  }

  if (execution.signal) {
    return `Process exited from signal ${execution.signal}.${getOutputPreviewSuffix(execution)}`;
  }

  if (execution.exitCode !== null) {
    return `Process exited with code ${execution.exitCode}.${getOutputPreviewSuffix(execution)}`;
  }

  return `Process did not report an exit code.${getOutputPreviewSuffix(execution)}`;
}

function getOutputPreviewSuffix(execution: VerificationCommandExecutionResult): string {
  const preview = getOutputPreview(execution);

  return preview ? ` Output: ${preview}` : "";
}

function getOutputPreview(execution: VerificationCommandExecutionResult): string | null {
  const preferredOutput =
    stripAnsiCodes(execution.stderr).trim() || stripAnsiCodes(execution.stdout).trim();
  if (!preferredOutput) {
    return null;
  }

  const lines = preferredOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const firstMeaningfulLine = lines.find((line) => !line.startsWith("$ ")) ?? lines[0];

  return firstMeaningfulLine ? truncateSummary(firstMeaningfulLine) : null;
}

function stripAnsiCodes(value: string): string {
  return value.replace(ANSI_CODE_PATTERN, "");
}

function truncateSummary(summary: string): string {
  if (summary.length <= SUMMARY_PREVIEW_LENGTH) {
    return summary;
  }

  return `${summary.slice(0, SUMMARY_PREVIEW_LENGTH - 1)}…`;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}
