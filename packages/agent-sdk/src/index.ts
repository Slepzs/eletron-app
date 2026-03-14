import type {
  AgentKind,
  AgentRole,
  AgentSession,
  AgentSessionStatus,
  Artifact,
  DomainEvent,
  Run,
  StructuredHandoff,
  StructuredHandoffSpec,
  Task,
} from "@iamrobot/protocol";

export interface StartAgentSessionInput {
  readonly run: Run;
  readonly task: Task;
  readonly adapter: AgentKind;
  readonly role: AgentRole;
  readonly prompt: string;
  readonly cwd: string;
  readonly allowedPaths: readonly string[];
  readonly handoff: StructuredHandoffSpec;
}

export interface AgentStreamChunk {
  readonly type: "stderr" | "stdout";
  readonly sessionId: AgentSession["sessionId"];
  readonly content: string;
  readonly timestamp: string;
}

export interface AgentHandoffEvent {
  readonly type: "handoff";
  readonly sessionId: AgentSession["sessionId"];
  readonly handoff: StructuredHandoff;
  readonly rawText: string;
  readonly timestamp: string;
}

export interface AgentSessionStatusEvent {
  readonly type: "session.status";
  readonly sessionId: AgentSession["sessionId"];
  readonly previousStatus?: AgentSessionStatus;
  readonly status: AgentSessionStatus;
  readonly timestamp: string;
}

export type AgentStreamEvent =
  | AgentHandoffEvent
  | AgentSessionStatusEvent
  | AgentStreamChunk
  | DomainEvent;

export interface AgentSessionHandle {
  readonly session: AgentSession;
  readonly sessionId: AgentSession["sessionId"];
  sendMessage(message: string): Promise<void>;
  interrupt(): Promise<void>;
  terminate(): Promise<void>;
  collectArtifacts(): Promise<readonly Artifact[]>;
}

export type AgentEventSubscriber = (event: AgentStreamEvent) => void;
export type Unsubscribe = () => void;

export interface AgentAdapter {
  readonly kind: AgentKind;
  startSession(input: StartAgentSessionInput): Promise<AgentSessionHandle>;
  streamEvents(
    sessionId: AgentSession["sessionId"],
    onEvent: AgentEventSubscriber,
  ): Promise<Unsubscribe>;
}
