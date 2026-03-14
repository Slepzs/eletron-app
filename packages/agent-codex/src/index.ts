import type {
  AgentAdapter,
  AgentEventSubscriber,
  AgentSessionHandle,
  StartAgentSessionInput,
  Unsubscribe,
} from "@iamrobot/agent-sdk";
import { createEntityId } from "@iamrobot/protocol";

function createPlaceholderSessionHandle(): AgentSessionHandle {
  return {
    sessionId: createEntityId("agent-session", "codex-placeholder"),
    async sendMessage(): Promise<void> {
      throw new Error("Codex CLI session messaging is not implemented yet.");
    },
    async interrupt(): Promise<void> {
      throw new Error("Codex CLI session interruption is not implemented yet.");
    },
    async terminate(): Promise<void> {
      throw new Error("Codex CLI session termination is not implemented yet.");
    },
    async collectArtifacts() {
      return [];
    },
  };
}

export class CodexCliAdapter implements AgentAdapter {
  readonly kind = "codex" as const;

  async startSession(_input: StartAgentSessionInput): Promise<AgentSessionHandle> {
    return createPlaceholderSessionHandle();
  }

  async streamEvents(_sessionId: string, _onEvent: AgentEventSubscriber): Promise<Unsubscribe> {
    return () => undefined;
  }
}
