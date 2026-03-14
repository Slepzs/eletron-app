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
  const sessionId = createEntityId("agent-session", "codex-placeholder");
  const session: AgentSession = {
    sessionId,
    runId: input.run.runId,
    adapter: "codex",
    role: input.role,
    status: "running",
    startedAt: createTimestamp(),
  };

  return {
    session,
    sessionId,
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
