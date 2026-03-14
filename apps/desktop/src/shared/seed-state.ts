import { ClaudeCodeAdapter } from "@iamrobot/agent-claude";
import { CodexCliAdapter } from "@iamrobot/agent-codex";
import { createRunRecord, createTaskDefinition } from "@iamrobot/orchestration";
import { createDefaultVerificationProfile } from "@iamrobot/verification";

const verificationProfile = createDefaultVerificationProfile();

export const seedTask = createTaskDefinition({
  repoPath: "/Users/example/project",
  baseBranch: "main",
  goal: "Coordinate a safe planner-implementer-reviewer loop with auditable outputs.",
  constraints: [
    "Keep orchestration in the local runtime.",
    "Avoid shared writes across agent workspaces.",
    "Treat automated verification as authoritative.",
  ],
  acceptanceCriteria: [
    "A task can define the goal, repository, and verification profile.",
    "Runs move through the documented planning, implementation, review, and verification stages.",
    "The desktop shell can render current task metadata without owning orchestration logic.",
  ],
  allowedPaths: [
    "apps/desktop",
    "packages/agent-claude",
    "packages/agent-codex",
    "packages/orchestration",
    "packages/protocol",
    "packages/verification",
  ],
  verificationProfile: verificationProfile.name,
});

export const seedRun = createRunRecord({
  task: seedTask,
});

export const seedAgents = [new ClaudeCodeAdapter(), new CodexCliAdapter()] as const;

export interface DesktopSeedState {
  readonly task: typeof seedTask;
  readonly run: typeof seedRun;
  readonly agents: readonly {
    readonly kind: (typeof seedAgents)[number]["kind"];
  }[];
}

export function getDesktopSeedState(): DesktopSeedState {
  return {
    task: seedTask,
    run: seedRun,
    agents: seedAgents.map((agent) => ({ kind: agent.kind })),
  };
}
