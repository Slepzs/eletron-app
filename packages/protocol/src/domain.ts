import type {
  AgentSessionId,
  ApprovalRequestId,
  ArtifactId,
  RunId,
  TaskId,
  VerificationResultId,
} from "./ids";

export type AgentKind = "claude" | "codex";
export type AgentRole = "implementer" | "planner" | "reviewer";
export type AgentSessionStatus = "completed" | "failed" | "interrupted" | "pending" | "running";

export type RunStage = "complete" | "implementing" | "planning" | "reviewing" | "verifying";
export type RunStatus = "blocked" | "failed" | "in_progress" | "succeeded";

export type ArtifactKind =
  | "diff"
  | "handoff"
  | "log"
  | "patch"
  | "plan"
  | "screenshot"
  | "verdict"
  | "verification";

export type VerificationCheckKind = "lint" | "policy" | "smoke" | "tests" | "typecheck";
export type VerificationCheckStatus = "failed" | "passed" | "skipped";
export type VerdictStatus = "accepted" | "needs_retry" | "rejected";

export type ApprovalKind = "command" | "file" | "network" | "policy";
export type ApprovalDecision = "approved" | "pending" | "rejected";

export type HandoffSectionKey = "ASSUMPTIONS" | "CHANGES" | "PLAN" | "REQUESTED_ACTION" | "RISKS";

export interface Task {
  readonly taskId: TaskId;
  readonly repoPath: string;
  readonly baseBranch: string;
  readonly goal: string;
  readonly constraints: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly allowedPaths: readonly string[];
  readonly verificationProfile: string;
}

export interface Run {
  readonly runId: RunId;
  readonly taskId: TaskId;
  readonly status: RunStatus;
  readonly stage: RunStage;
  readonly currentAttempt: number;
  readonly maxAttempts: number;
  readonly startedAt: string;
  readonly completedAt?: string;
}

export interface AgentSession {
  readonly sessionId: AgentSessionId;
  readonly runId: RunId;
  readonly adapter: AgentKind;
  readonly role: AgentRole;
  readonly status: AgentSessionStatus;
  readonly startedAt: string;
  readonly endedAt?: string;
}

export interface Artifact {
  readonly artifactId: ArtifactId;
  readonly runId: RunId;
  readonly sessionId?: AgentSessionId;
  readonly kind: ArtifactKind;
  readonly label: string;
  readonly path?: string;
  readonly contentType?: string;
  readonly createdAt: string;
}

export interface VerificationCheckResult {
  readonly kind: VerificationCheckKind;
  readonly status: VerificationCheckStatus;
  readonly summary: string;
  readonly command: string;
}

export interface VerificationResult {
  readonly verificationResultId: VerificationResultId;
  readonly runId: RunId;
  readonly status: Exclude<VerificationCheckStatus, "skipped">;
  readonly checks: readonly VerificationCheckResult[];
  readonly completedAt: string;
}

export interface Verdict {
  readonly status: VerdictStatus;
  readonly summary: string;
  readonly blockingIssues: readonly string[];
  readonly proposedNextAction: string | null;
  readonly confidence: number;
}

export interface ApprovalRequest {
  readonly approvalRequestId: ApprovalRequestId;
  readonly runId: RunId;
  readonly kind: ApprovalKind;
  readonly title: string;
  readonly description: string;
  readonly requestedAt: string;
  readonly resolvedAt?: string;
  readonly decision: ApprovalDecision;
}

export interface StructuredHandoff {
  readonly sections: Readonly<Record<HandoffSectionKey, string>>;
}
