import type {
  AgentSession,
  AgentSessionStatus,
  ApprovalRequest,
  Artifact,
  Run,
  RunStage,
  RunStatus,
  Task,
  Verdict,
  VerificationCheckKind,
  VerificationResult,
} from "./domain";
import type { StructuredHandoff } from "./handoff";

export type DomainEventType =
  | "agent.handoff.received"
  | "agent.session.started"
  | "agent.session.status.changed"
  | "approval.requested"
  | "approval.resolved"
  | "artifact.recorded"
  | "run.created"
  | "run.stage.changed"
  | "run.status.changed"
  | "run.verdict.recorded"
  | "verification.completed"
  | "verification.started";

interface DomainEventBase<Type extends DomainEventType> {
  readonly type: Type;
  readonly timestamp: string;
}

export interface ApprovalRequestedEvent extends DomainEventBase<"approval.requested"> {
  readonly runId: Run["runId"];
  readonly approvalRequest: ApprovalRequest;
}

export interface ApprovalResolvedEvent extends DomainEventBase<"approval.resolved"> {
  readonly runId: Run["runId"];
  readonly approvalRequest: ApprovalRequest;
}

export interface AgentHandoffReceivedEvent extends DomainEventBase<"agent.handoff.received"> {
  readonly runId: Run["runId"];
  readonly handoff: StructuredHandoff;
  readonly session: AgentSession;
}

export interface AgentSessionStartedEvent extends DomainEventBase<"agent.session.started"> {
  readonly runId: Run["runId"];
  readonly session: AgentSession;
}

export interface AgentSessionStatusChangedEvent
  extends DomainEventBase<"agent.session.status.changed"> {
  readonly runId: Run["runId"];
  readonly sessionId: AgentSession["sessionId"];
  readonly previousStatus?: AgentSessionStatus;
  readonly nextStatus: AgentSessionStatus;
}

export interface ArtifactRecordedEvent extends DomainEventBase<"artifact.recorded"> {
  readonly runId: Run["runId"];
  readonly artifact: Artifact;
}

export interface RunCreatedEvent extends DomainEventBase<"run.created"> {
  readonly run: Run;
  readonly task: Task;
}

export interface RunStageChangedEvent extends DomainEventBase<"run.stage.changed"> {
  readonly runId: Run["runId"];
  readonly previousStage: RunStage;
  readonly nextStage: RunStage;
}

export interface RunStatusChangedEvent extends DomainEventBase<"run.status.changed"> {
  readonly runId: Run["runId"];
  readonly previousStatus: RunStatus;
  readonly nextStatus: RunStatus;
}

export interface RunVerdictRecordedEvent extends DomainEventBase<"run.verdict.recorded"> {
  readonly runId: Run["runId"];
  readonly verdict: Verdict;
}

export interface VerificationStartedEvent extends DomainEventBase<"verification.started"> {
  readonly runId: Run["runId"];
  readonly verificationProfile: Task["verificationProfile"];
  readonly checks: readonly VerificationCheckKind[];
}

export interface VerificationCompletedEvent extends DomainEventBase<"verification.completed"> {
  readonly result: VerificationResult;
}

export type DomainEvent =
  | AgentHandoffReceivedEvent
  | AgentSessionStartedEvent
  | AgentSessionStatusChangedEvent
  | ApprovalRequestedEvent
  | ApprovalResolvedEvent
  | ArtifactRecordedEvent
  | RunCreatedEvent
  | RunStageChangedEvent
  | RunStatusChangedEvent
  | RunVerdictRecordedEvent
  | VerificationCompletedEvent
  | VerificationStartedEvent;

export function createTimestamp(date = new Date()): string {
  return date.toISOString();
}
