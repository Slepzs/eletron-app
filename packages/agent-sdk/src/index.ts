import type {
  AgentKind,
  AgentRole,
  Artifact,
  DomainEvent,
  Run,
  StructuredHandoff,
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
}

export interface AgentStreamChunk {
  readonly type: "stderr" | "stdout";
  readonly content: string;
  readonly timestamp: string;
}

export interface AgentHandoffEvent {
  readonly type: "handoff";
  readonly handoff: StructuredHandoff;
  readonly rawText: string;
}

export type AgentStreamEvent = AgentStreamChunk | AgentHandoffEvent | DomainEvent;

export interface AgentSessionHandle {
  readonly sessionId: string;
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
  streamEvents(sessionId: string, onEvent: AgentEventSubscriber): Promise<Unsubscribe>;
}
