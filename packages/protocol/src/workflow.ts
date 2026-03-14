import type { AgentKind, AgentRole, RunStage, RunStatus, Verdict } from "./domain";

export const RUN_STAGE_SEQUENCE = [
  "planning",
  "implementing",
  "reviewing",
  "verifying",
  "complete",
] as const satisfies readonly RunStage[];

export interface RunStageTransition {
  readonly from: RunStage;
  readonly to: RunStage;
}

export type AgentRoleAssignments = Readonly<Partial<Record<AgentRole, AgentKind>>>;

export const RUN_STAGE_TRANSITIONS = [
  {
    from: "planning",
    to: "implementing",
  },
  {
    from: "implementing",
    to: "reviewing",
  },
  {
    from: "reviewing",
    to: "verifying",
  },
  {
    from: "verifying",
    to: "complete",
  },
] as const satisfies readonly RunStageTransition[];

export function canTransitionRunStage(currentStage: RunStage, nextStage: RunStage): boolean {
  return RUN_STAGE_TRANSITIONS.some(
    (transition) => transition.from === currentStage && transition.to === nextStage,
  );
}

export function isTerminalRunStage(stage: RunStage): stage is "complete" {
  return stage === "complete";
}

export function getDefaultAgentRoleAssignments(): Readonly<
  Pick<Record<AgentRole, AgentKind>, "implementer" | "planner" | "reviewer">
> {
  return {
    planner: "claude",
    implementer: "codex",
    reviewer: "claude",
  };
}

export function resolveRunStatus(verdictStatus: Verdict["status"]): RunStatus {
  switch (verdictStatus) {
    case "accepted":
      return "succeeded";
    case "needs_retry":
      return "blocked";
    case "rejected":
      return "failed";
  }
}
