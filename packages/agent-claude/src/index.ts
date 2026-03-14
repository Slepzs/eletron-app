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
    sessionId: createEntityId("agent-session", "claude-placeholder"),
    async sendMessage(): Promise<void> {
      throw new Error("Claude Code session messaging is not implemented yet.");
    },
    async interrupt(): Promise<void> {
      throw new Error("Claude Code session interruption is not implemented yet.");
    },
    async terminate(): Promise<void> {
      throw new Error("Claude Code session termination is not implemented yet.");
    },
    async collectArtifacts() {
      return [];
    },
  };
}

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly kind = "claude" as const;

  async startSession(_input: StartAgentSessionInput): Promise<AgentSessionHandle> {
    return createPlaceholderSessionHandle();
  }

  async streamEvents(_sessionId: string, _onEvent: AgentEventSubscriber): Promise<Unsubscribe> {
    return () => undefined;
  }
}
