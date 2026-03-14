import type {
  AgentSession,
  ApprovalRequest,
  Run,
  RunStage,
  StructuredHandoff,
  Task,
  Verdict,
  VerificationResult,
} from "./domain";

export type DomainEvent =
  | {
      readonly type: "approval.requested";
      readonly timestamp: string;
      readonly approvalRequest: ApprovalRequest;
    }
  | {
      readonly type: "agent.handoff.received";
      readonly timestamp: string;
      readonly handoff: StructuredHandoff;
      readonly session: AgentSession;
    }
  | {
      readonly type: "agent.session.started";
      readonly timestamp: string;
      readonly session: AgentSession;
    }
  | {
      readonly type: "run.created";
      readonly timestamp: string;
      readonly run: Run;
      readonly task: Task;
    }
  | {
      readonly type: "run.stage.changed";
      readonly timestamp: string;
      readonly runId: Run["runId"];
      readonly previousStage: RunStage;
      readonly nextStage: RunStage;
    }
  | {
      readonly type: "run.verdict.recorded";
      readonly timestamp: string;
      readonly runId: Run["runId"];
      readonly verdict: Verdict;
    }
  | {
      readonly type: "verification.completed";
      readonly timestamp: string;
      readonly result: VerificationResult;
    };

export function createTimestamp(date = new Date()): string {
  return date.toISOString();
}
