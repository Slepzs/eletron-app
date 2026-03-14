import type { AgentRole, RunId } from "@iamrobot/protocol";

export interface WorktreePlan {
  readonly runId: RunId;
  readonly branchName: string;
  readonly worktreePath: string;
  readonly role: AgentRole;
}

export function createRunBranchName(runId: RunId, role: AgentRole): string {
  return `run/${role}/${runId}`;
}

export function createWorktreePath(basePath: string, runId: RunId, role: AgentRole): string {
  return `${basePath}/.worktrees/${runId}/${role}`;
}
