import { join, resolve } from "node:path";

import type { AgentRole, RunId } from "@iamrobot/protocol";

import type { CreateWorktreePlanInput, WorktreePlan } from "./contracts.js";

export function createRunBranchPrefix(runId: RunId): string {
  return `run/${runId}`;
}

export function createRunBranchName(runId: RunId, role: AgentRole): string {
  return `${createRunBranchPrefix(runId)}/${role}`;
}

export function createWorktreePath(basePath: string, runId: RunId, role: AgentRole): string {
  return resolve(join(basePath, ".worktrees", runId, role));
}

export function createWorktreePlan(input: CreateWorktreePlanInput): WorktreePlan {
  return {
    runId: input.runId,
    role: input.role,
    branchName: createRunBranchName(input.runId, input.role),
    worktreePath: createWorktreePath(input.repoPath, input.runId, input.role),
  };
}
