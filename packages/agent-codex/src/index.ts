import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type {
  AgentAdapter,
  AgentEventSubscriber,
  AgentSessionHandle,
  AgentStreamEvent,
  StartAgentSessionInput,
  Unsubscribe,
} from "@iamrobot/agent-sdk";
import type { AgentSession, AgentSessionStatus, Artifact } from "@iamrobot/protocol";
import { createEntityId, createTimestamp } from "@iamrobot/protocol";

import { CodexArtifactStore } from "./artifacts";
import { buildCodexPrompt, parseStructuredHandoff } from "./handoff";

type SpawnCodexProcess = (args: readonly string[], cwd: string) => ChildProcessWithoutNullStreams;

interface QueuedCodexTurn {
  readonly prompt: string;
  readonly type: "resume" | "start";
}

interface MutableAgentSession {
  sessionId: AgentSession["sessionId"];
  runId: AgentSession["runId"];
  adapter: AgentSession["adapter"];
  role: AgentSession["role"];
  status: AgentSessionStatus;
  startedAt: string;
  endedAt: string | undefined;
}

interface CodexSessionRecord {
  readonly artifactStore: CodexArtifactStore;
  readonly eventHistory: AgentStreamEvent[];
  readonly input: StartAgentSessionInput;
  readonly session: MutableAgentSession;
  readonly subscribers: Set<AgentEventSubscriber>;
  activeProcess: ChildProcessWithoutNullStreams | undefined;
  sessionThreadId: string | undefined;
  stdoutBuffer: string;
  terminated: boolean;
  turnQueue: Promise<void>;
}

export interface CodexCliAdapterOptions {
  readonly artifactsRoot?: string;
  readonly codexCommand?: string;
  readonly createArtifactId?: () => Artifact["artifactId"];
  readonly createSessionId?: () => AgentSession["sessionId"];
  readonly createTimestamp?: () => string;
  readonly spawnCodex?: SpawnCodexProcess;
}

export class CodexCliAdapter implements AgentAdapter {
  readonly kind = "codex" as const;

  private readonly artifactsRoot: string | undefined;
  private readonly createArtifactId: () => Artifact["artifactId"];
  private readonly createSessionId: () => AgentSession["sessionId"];
  private readonly createTimestamp: () => string;
  private readonly sessions = new Map<AgentSession["sessionId"], CodexSessionRecord>();
  private readonly spawnCodex: SpawnCodexProcess;

  constructor(options: CodexCliAdapterOptions = {}) {
    this.artifactsRoot = options.artifactsRoot;
    this.createArtifactId =
      options.createArtifactId ?? (() => createEntityId("artifact", randomUUID()));
    this.createSessionId =
      options.createSessionId ?? (() => createEntityId("agent-session", randomUUID()));
    this.createTimestamp = options.createTimestamp ?? (() => createTimestamp());
    this.spawnCodex =
      options.spawnCodex ??
      ((args, cwd) =>
        spawn(options.codexCommand ?? "codex", args, {
          cwd,
          env: process.env,
          stdio: ["pipe", "pipe", "pipe"],
        }));
  }

  async startSession(input: StartAgentSessionInput): Promise<AgentSessionHandle> {
    const sessionId = this.createSessionId();
    const session: MutableAgentSession = {
      sessionId,
      runId: input.run.runId,
      adapter: this.kind,
      role: input.role,
      status: "pending",
      startedAt: this.createTimestamp(),
      endedAt: undefined,
    };
    const record: CodexSessionRecord = {
      artifactStore: new CodexArtifactStore({
        artifactsRoot: this.artifactsRoot,
        createArtifactId: this.createArtifactId,
        createTimestamp: this.createTimestamp,
        runId: input.run.runId,
        sessionId,
      }),
      eventHistory: [],
      input,
      session,
      subscribers: new Set<AgentEventSubscriber>(),
      activeProcess: undefined,
      sessionThreadId: undefined,
      stdoutBuffer: "",
      terminated: false,
      turnQueue: Promise.resolve(),
    };

    this.sessions.set(sessionId, record);
    void this.enqueueTurn(record, {
      prompt: input.prompt,
      type: "start",
    }).catch(() => {});

    return {
      get session() {
        return toAgentSession(record.session);
      },
      sessionId,
      sendMessage: async (message: string) =>
        this.enqueueTurn(record, { prompt: message, type: "resume" }),
      interrupt: async () => this.interruptSession(record),
      terminate: async () => this.terminateSession(record),
      collectArtifacts: async () => record.artifactStore.collectArtifacts(),
    };
  }

  async streamEvents(
    sessionId: AgentSessionHandle["sessionId"],
    onEvent: AgentEventSubscriber,
  ): Promise<Unsubscribe> {
    const record = this.sessions.get(sessionId);

    if (!record) {
      throw new Error(`Unknown Codex session: ${sessionId}`);
    }

    for (const event of record.eventHistory) {
      onEvent(event);
    }

    record.subscribers.add(onEvent);

    return () => {
      record.subscribers.delete(onEvent);
    };
  }

  private async enqueueTurn(record: CodexSessionRecord, turn: QueuedCodexTurn): Promise<void> {
    if (record.terminated) {
      throw new Error(`Codex session ${record.session.sessionId} has already been terminated.`);
    }

    if (turn.type === "resume" && !record.sessionThreadId && record.session.status !== "pending") {
      throw new Error(
        `Codex session ${record.session.sessionId} cannot resume without a thread id.`,
      );
    }

    const nextTurn = record.turnQueue.catch(() => undefined).then(() => this.runTurn(record, turn));
    record.turnQueue = nextTurn.catch(() => undefined);

    return nextTurn;
  }

  private runTurn(record: CodexSessionRecord, turn: QueuedCodexTurn): Promise<void> {
    const sessionThreadId = record.sessionThreadId;

    if (turn.type === "resume" && !sessionThreadId) {
      return Promise.reject(
        new Error(`Codex session ${record.session.sessionId} cannot resume without a thread id.`),
      );
    }

    const args =
      turn.type === "start"
        ? this.createStartArgs(record.input)
        : createResumeArgsForTurn(turn, sessionThreadId);
    const child = this.spawnCodex(args, record.input.cwd);
    const prompt = buildCodexPrompt(turn.prompt, record.input.handoff);

    record.activeProcess = child;
    this.updateSessionStatus(record, "running");

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      this.handleStdoutChunk(record, chunk);
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      record.artifactStore.recordStreamChunk("stderr", chunk);
      this.publishEvent(record, {
        type: "stderr",
        sessionId: record.session.sessionId,
        content: chunk,
        timestamp: this.createTimestamp(),
      });
    });

    child.stdin.end(prompt);

    return new Promise<void>((resolvePromise, rejectPromise) => {
      let settled = false;

      const settle = (
        outcome: "reject" | "resolve",
        terminalStatus: AgentSessionStatus,
        error?: Error,
      ) => {
        if (settled) {
          return;
        }

        settled = true;
        record.activeProcess = undefined;
        this.updateSessionStatus(record, terminalStatus);

        if (outcome === "resolve") {
          resolvePromise();
          return;
        }

        rejectPromise(error ?? new Error(`Codex session ${record.session.sessionId} failed.`));
      };

      child.on("error", (error) => {
        settle("reject", "failed", error instanceof Error ? error : new Error(String(error)));
      });

      child.on("close", (exitCode, signal) => {
        if (record.stdoutBuffer.length > 0) {
          this.handleStdoutChunk(record, "\n");
        }

        if (signal) {
          settle("reject", "interrupted", new Error(`Codex session interrupted by ${signal}.`));
          return;
        }

        if (exitCode === 0) {
          settle("resolve", "completed");
          return;
        }

        settle("reject", "failed", new Error(`Codex exited with code ${exitCode ?? "unknown"}.`));
      });
    });
  }

  private handleStdoutChunk(record: CodexSessionRecord, chunk: string): void {
    const combinedBuffer = `${record.stdoutBuffer}${chunk}`;
    const lines = combinedBuffer.split(/\r?\n/u);
    record.stdoutBuffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      if (rawLine.length === 0) {
        continue;
      }

      record.artifactStore.recordRawEvent(rawLine);

      const rawEvent = parseJsonLine(rawLine);

      if (!rawEvent) {
        record.artifactStore.recordStreamChunk("stdout", `${rawLine}\n`);
        this.publishEvent(record, {
          type: "stdout",
          sessionId: record.session.sessionId,
          content: `${rawLine}\n`,
          timestamp: this.createTimestamp(),
        });

        continue;
      }

      if (isThreadStartedEvent(rawEvent)) {
        record.sessionThreadId = rawEvent.thread_id;
        continue;
      }

      if (!isCompletedAgentMessageEvent(rawEvent)) {
        continue;
      }

      record.artifactStore.recordStreamChunk("stdout", `${rawEvent.item.text}\n`);
      this.publishEvent(record, {
        type: "stdout",
        sessionId: record.session.sessionId,
        content: rawEvent.item.text,
        timestamp: this.createTimestamp(),
      });

      const handoff = parseStructuredHandoff(rawEvent.item.text, record.input.handoff);

      if (!handoff) {
        continue;
      }

      record.artifactStore.recordHandoff(rawEvent.item.text);
      this.publishEvent(record, {
        type: "handoff",
        sessionId: record.session.sessionId,
        handoff,
        rawText: rawEvent.item.text,
        timestamp: this.createTimestamp(),
      });
    }
  }

  private async interruptSession(record: CodexSessionRecord): Promise<void> {
    record.activeProcess?.kill("SIGINT");
  }

  private async terminateSession(record: CodexSessionRecord): Promise<void> {
    record.terminated = true;

    if (!record.activeProcess) {
      this.updateSessionStatus(record, "interrupted");
      return;
    }

    record.activeProcess.kill("SIGTERM");

    try {
      await record.turnQueue;
    } catch {
      return;
    }
  }

  private createStartArgs(input: StartAgentSessionInput): readonly string[] {
    const args = ["exec", "--json", "-C", input.cwd];
    const addDirs = new Set(
      input.allowedPaths
        .map((allowedPath) => resolve(input.task.repoPath, allowedPath))
        .filter((allowedPath) => allowedPath !== input.cwd),
    );

    for (const addDir of addDirs) {
      args.push("--add-dir", addDir);
    }

    args.push("-");
    return args;
  }

  private updateSessionStatus(record: CodexSessionRecord, nextStatus: AgentSessionStatus): void {
    const previousStatus = record.session.status;

    if (previousStatus === nextStatus) {
      return;
    }

    record.session.status = nextStatus;
    if (nextStatus === "completed" || nextStatus === "failed" || nextStatus === "interrupted") {
      record.session.endedAt = this.createTimestamp();
    } else {
      record.session.endedAt = undefined;
    }

    this.publishEvent(record, {
      type: "session.status",
      sessionId: record.session.sessionId,
      previousStatus,
      status: nextStatus,
      timestamp: this.createTimestamp(),
    });
  }

  private publishEvent(record: CodexSessionRecord, event: AgentStreamEvent): void {
    record.eventHistory.push(event);

    for (const subscriber of record.subscribers) {
      subscriber(event);
    }
  }
}

function isCompletedAgentMessageEvent(value: unknown): value is {
  readonly item: { readonly text: string; readonly type: "agent_message" };
  readonly type: "item.completed";
} {
  if (!isRecord(value) || value.type !== "item.completed") {
    return false;
  }

  const item = value.item;
  return isRecord(item) && item.type === "agent_message" && typeof item.text === "string";
}

function isThreadStartedEvent(
  value: unknown,
): value is { readonly thread_id: string; readonly type: "thread.started" } {
  return isRecord(value) && value.type === "thread.started" && typeof value.thread_id === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJsonLine(rawLine: string): unknown {
  try {
    return JSON.parse(rawLine) as unknown;
  } catch {
    return undefined;
  }
}

function createResumeArgsForTurn(
  turn: QueuedCodexTurn,
  sessionThreadId: string | undefined,
): readonly string[] {
  if (turn.type !== "resume" || !sessionThreadId) {
    throw new Error("Cannot create resume args without a Codex thread id.");
  }

  return ["exec", "resume", "--json", sessionThreadId, "-"];
}

function toAgentSession(session: MutableAgentSession): AgentSession {
  if (session.endedAt) {
    return {
      sessionId: session.sessionId,
      runId: session.runId,
      adapter: session.adapter,
      role: session.role,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };
  }

  return {
    sessionId: session.sessionId,
    runId: session.runId,
    adapter: session.adapter,
    role: session.role,
    status: session.status,
    startedAt: session.startedAt,
  };
}
