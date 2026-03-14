import { randomUUID } from "node:crypto";

import type { Run, Task, Verdict } from "@iamrobot/protocol";
import {
  canTransitionRunStage,
  createEntityId,
  createTimestamp,
  getDefaultAgentRoleAssignments,
  resolveRunStatus,
} from "@iamrobot/protocol";

import type { CreateRunInput, CreateTaskInput } from "./contracts";

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

export function advanceRunStage(run: Run, nextStage: Run["stage"]): Run {
  if (!canTransitionRunStage(run.stage, nextStage)) {
    throw new Error(`Invalid run stage transition from ${run.stage} to ${nextStage}.`);
  }

  return {
    ...run,
    stage: nextStage,
  };
}

export function attachVerdict(run: Run, verdict: Verdict): Run {
  return {
    ...run,
    stage: "complete",
    status: resolveRunStatus(verdict.status),
    completedAt: createTimestamp(),
  };
}

export function getDefaultRoleAssignments(): ReturnType<typeof getDefaultAgentRoleAssignments> {
  return getDefaultAgentRoleAssignments();
}
