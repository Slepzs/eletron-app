import type {
  AgentAdapter,
  AgentEventSubscriber,
  AgentSessionHandle,
  StartAgentSessionInput,
  Unsubscribe,
} from "@iamrobot/agent-sdk";
import type { AgentSession } from "@iamrobot/protocol";
import { createEntityId, createTimestamp } from "@iamrobot/protocol";

function createPlaceholderSessionHandle(input: StartAgentSessionInput): AgentSessionHandle {
  const sessionId = createEntityId("agent-session", "claude-placeholder");
  const session: AgentSession = {
    sessionId,
    runId: input.run.runId,
    adapter: "claude",
    role: input.role,
    status: "running",
    startedAt: createTimestamp(),
  };

  return {
    session,
    sessionId,
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

  async startSession(input: StartAgentSessionInput): Promise<AgentSessionHandle> {
    return createPlaceholderSessionHandle(input);
  }

  async streamEvents(
    _sessionId: AgentSessionHandle["sessionId"],
    _onEvent: AgentEventSubscriber,
  ): Promise<Unsubscribe> {
    return () => undefined;
  }
}
