import { randomUUID } from "node:crypto";

import type { AgentKind, Run, RunStage, RunStatus, Task, Verdict } from "@iamrobot/protocol";
import { createEntityId, createTimestamp } from "@iamrobot/protocol";
import type { VerificationProfile } from "@iamrobot/verification";

const RUN_STAGE_SEQUENCE = [
  "planning",
  "implementing",
  "reviewing",
  "verifying",
  "complete",
] as const satisfies readonly RunStage[];

export interface CreateTaskInput {
  readonly repoPath: string;
  readonly baseBranch: string;
  readonly goal: string;
  readonly constraints?: readonly string[];
  readonly acceptanceCriteria?: readonly string[];
  readonly allowedPaths?: readonly string[];
  readonly verificationProfile?: VerificationProfile;
}

export interface CreateRunInput {
  readonly task: Task;
  readonly maxAttempts?: number;
}

export function createTaskDefinition(input: CreateTaskInput): Task {
  return {
    taskId: createEntityId("task", randomUUID()),
    repoPath: input.repoPath,
    baseBranch: input.baseBranch,
    goal: input.goal,
    constraints: input.constraints ?? [],
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    allowedPaths: input.allowedPaths ?? [],
    verificationProfile: input.verificationProfile?.name ?? "default",
  };
}

export function createRunRecord(input: CreateRunInput): Run {
  return {
    runId: createEntityId("run", randomUUID()),
    taskId: input.task.taskId,
    status: "in_progress",
    stage: "planning",
    currentAttempt: 1,
    maxAttempts: input.maxAttempts ?? 2,
    startedAt: createTimestamp(),
  };
}

export function advanceRunStage(run: Run, nextStage: RunStage): Run {
  const currentIndex = RUN_STAGE_SEQUENCE.indexOf(run.stage);
  const nextIndex = RUN_STAGE_SEQUENCE.indexOf(nextStage);

  if (nextIndex < currentIndex || nextIndex - currentIndex > 1) {
    throw new Error(`Invalid run stage transition from ${run.stage} to ${nextStage}.`);
  }

  return {
    ...run,
    stage: nextStage,
  };
}

export function attachVerdict(run: Run, verdict: Verdict): Run {
  const status: RunStatus = resolveRunStatus(verdict.status);

  return {
    ...run,
    stage: "complete",
    status,
    completedAt: createTimestamp(),
  };
}

export function getDefaultRoleAssignments(): Readonly<
  Record<AgentKind, "implementer" | "planner">
> {
  return {
    claude: "planner",
    codex: "implementer",
  };
}

function resolveRunStatus(verdictStatus: Verdict["status"]): RunStatus {
  switch (verdictStatus) {
    case "accepted":
      return "succeeded";
    case "needs_retry":
      return "blocked";
    case "rejected":
      return "failed";
  }
}
