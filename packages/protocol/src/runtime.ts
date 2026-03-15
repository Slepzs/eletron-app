import type {
  AgentOutputChannel,
  AgentSession,
  ApprovalRequest,
  Artifact,
  Project,
  Run,
  Task,
  Verdict,
  VerificationResult,
} from "./domain.js";
import type { DomainEvent } from "./events.js";

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

export interface AgentOutputChunk {
  readonly type: AgentOutputChannel;
  readonly runId: Run["runId"];
  readonly sessionId: AgentSession["sessionId"];
  readonly content: string;
  readonly timestamp: string;
}

export type RuntimeRunEvent = DomainEvent | AgentOutputChunk;

export interface RuntimeSnapshot {
  readonly runs: readonly RuntimeRunSummary[];
  readonly activeRunId: Run["runId"] | null;
  readonly projects: readonly Project[];
  readonly selectedProjectId: Project["projectId"] | null;
}
