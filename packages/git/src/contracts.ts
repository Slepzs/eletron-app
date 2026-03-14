import type { AgentRole, RunId } from "@iamrobot/protocol";

export interface WorktreePlan {
  readonly runId: RunId;
  readonly role: AgentRole;
  readonly branchName: string;
  readonly worktreePath: string;
}

export interface CreateWorktreePlanInput {
  readonly repoPath: string;
  readonly runId: RunId;
  readonly role: AgentRole;
}

export interface PrepareWorktreeInput extends CreateWorktreePlanInput {
  readonly baseBranch: string;
}

export interface PreparedWorktree extends WorktreePlan {
  readonly repoPath: string;
  readonly baseBranch: string;
  readonly headRevision: string;
  readonly created: boolean;
}

export interface RemoveWorktreeInput {
  readonly repoPath: string;
  readonly worktreePath: string;
  readonly branchName?: string;
  readonly force?: boolean;
  readonly removeBranch?: boolean;
}

export type GitIntegrationStrategy = "cherry-pick" | "merge";

export interface MergeBranchIntoWorktreeInput {
  readonly worktreePath: string;
  readonly sourceBranch: string;
}

export interface CherryPickBranchIntoWorktreeInput {
  readonly repoPath: string;
  readonly worktreePath: string;
  readonly sourceBranch: string;
  readonly targetBranch: string;
}

export interface IntegrateBranchInput {
  readonly repoPath: string;
  readonly worktreePath: string;
  readonly sourceBranch: string;
  readonly targetBranch: string;
  readonly strategy: GitIntegrationStrategy;
}

export interface BranchIntegrationResult {
  readonly strategy: GitIntegrationStrategy;
  readonly worktreePath: string;
  readonly sourceBranch: string;
  readonly targetBranch: string;
  readonly headRevision: string;
  readonly appliedCommitShas: readonly string[];
}
