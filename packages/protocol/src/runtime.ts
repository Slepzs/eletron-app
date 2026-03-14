import type {
  AgentSession,
  ApprovalRequest,
  Artifact,
  Run,
  Task,
  Verdict,
  VerificationResult,
} from "./domain";
import type { DomainEvent } from "./events";

export interface RuntimeRunSummary {
  readonly task: Task;
  readonly run: Run;
  readonly latestVerificationResult?: VerificationResult;
  readonly latestVerdict?: Verdict;
}

export interface RuntimeRunDetails extends RuntimeRunSummary {
  readonly sessions: readonly AgentSession[];
  readonly artifacts: readonly Artifact[];
  readonly approvalRequests: readonly ApprovalRequest[];
  readonly events: readonly DomainEvent[];
}

export interface RuntimeSnapshot {
  readonly runs: readonly RuntimeRunSummary[];
  readonly activeRunId: Run["runId"] | null;
}
