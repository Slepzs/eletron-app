import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  AgentAdapter,
  AgentEventSubscriber,
  AgentSessionHandle,
  AgentSessionStatusEvent,
  AgentStreamChunk,
  AgentStreamEvent,
  StartAgentSessionInput,
  Unsubscribe,
} from "@iamrobot/agent-sdk";
import type { AgentSession, AgentSessionStatus, Artifact } from "@iamrobot/protocol";
import { createEntityId, createTimestamp } from "@iamrobot/protocol";
import { createClaudeArgs, createClaudePrompt } from "./claude-prompt.js";
import {
  type ClaudeJsonStreamState,
  consumeClaudeStdoutChunk,
  createClaudeJsonStreamState,
  flushClaudeStdoutBuffer,
} from "./claude-stream.js";
import { parseStructuredHandoff } from "./structured-handoff.js";

type ClaudeChildProcess = ReturnType<typeof spawn>;

interface ClaudeExitError extends Error {
  exitCode: number | null;
  signal: string | null;
  stderrSnippet: string | null;
}

interface ClaudeSessionState {
  activeProcess: ClaudeChildProcess | undefined;
  readonly artifacts: Artifact[];
  readonly cliSessionId: string;
  closed: boolean;
  readonly eventBuffer: AgentStreamEvent[];
  readonly handoffSpec: StartAgentSessionInput["handoff"];
  invocationCount: number;
  readonly sessionId: AgentSession["sessionId"];
  session: AgentSession;
  startedEventEmitted: boolean;
  readonly subscribers: Set<AgentEventSubscriber>;
  work: Promise<void>;
  readonly workingDirectory: string;
}

interface ClaudeExecutionState {
  readonly invocationCount: number;
  interruptionRequested: boolean;
  readonly streamState: ClaudeJsonStreamState;
  stderr: string;
  stdout: string;
  terminationRequested: boolean;
}

const PROCESS_TERMINATION_TIMEOUT_MS = 2_000;

export interface ClaudeCodeAdapterOptions {
  readonly executablePath?: string;
}

function createDelay(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}

function hasProcessExited(process: ClaudeChildProcess): boolean {
  return process.exitCode !== null || process.signalCode !== null;
}

function waitForProcessExit(process: ClaudeChildProcess, timeoutMs: number): Promise<boolean> {
  if (hasProcessExited(process)) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      finish(false);
    }, timeoutMs);

    const finish = (didExit: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      process.off("close", onClose);
      process.off("exit", onExit);
      process.off("error", onError);
      resolve(didExit);
    };

    const onClose = () => finish(true);
    const onExit = () => finish(true);
    const onError = () => finish(true);

    process.once("close", onClose);
    process.once("exit", onExit);
    process.once("error", onError);
  });
}

async function terminateProcess(process: ClaudeChildProcess, timeoutMs: number): Promise<void> {
  if (hasProcessExited(process)) {
    return;
  }

  try {
    process.kill("SIGTERM");
  } catch {
    return;
  }

  if (await waitForProcessExit(process, timeoutMs)) {
    return;
  }

  try {
    process.kill("SIGKILL");
  } catch {
    return;
  }

  await waitForProcessExit(process, timeoutMs);
}

function resolveAdditionalDirectories(
  cwd: string,
  allowedPaths: readonly string[],
): readonly string[] {
  const directories = new Set<string>();

  for (const allowedPath of allowedPaths) {
    const resolvedPath = resolve(cwd, allowedPath);
    const directoryPath =
      existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()
        ? resolvedPath
        : dirname(resolvedPath);
    directories.add(directoryPath);
  }

  directories.delete(cwd);
  return [...directories];
}

function createStreamChunk(
  type: AgentStreamChunk["type"],
  runId: AgentStreamChunk["runId"],
  sessionId: AgentSession["sessionId"],
  content: string,
): AgentStreamChunk {
  return {
    type,
    runId,
    sessionId,
    content,
    timestamp: createTimestamp(),
  };
}

function createSessionStatusEvent(
  sessionId: AgentSession["sessionId"],
  previousStatus: AgentSessionStatus | undefined,
  status: AgentSessionStatus,
): AgentSessionStatusEvent {
  const event = {
    type: "session.status",
    sessionId,
    status,
    timestamp: createTimestamp(),
  } satisfies Omit<AgentSessionStatusEvent, "previousStatus">;

  return previousStatus === undefined ? event : { ...event, previousStatus };
}

function selectBestResponseText(
  textCandidates: readonly string[],
  handoffSpec: StartAgentSessionInput["handoff"],
): string | undefined {
  const candidatesByLength = [...textCandidates].sort((left, right) => right.length - left.length);

  for (const candidate of candidatesByLength) {
    if (parseStructuredHandoff(candidate, handoffSpec) !== null) {
      return candidate;
    }
  }

  return candidatesByLength[0];
}

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly kind = "claude" as const;

  readonly #executablePath: string;
  readonly #sessions = new Map<AgentSession["sessionId"], ClaudeSessionState>();

  constructor(options: ClaudeCodeAdapterOptions = {}) {
    this.#executablePath = options.executablePath ?? "claude";
  }

  async startSession(input: StartAgentSessionInput): Promise<AgentSessionHandle> {
    const startedAt = createTimestamp();
    const sessionId = createEntityId("agent-session", randomUUID());
    const session: AgentSession = {
      sessionId,
      runId: input.run.runId,
      adapter: "claude",
      role: input.role,
      status: "pending",
      startedAt,
    };

    const sessionState: ClaudeSessionState = {
      activeProcess: undefined,
      artifacts: [],
      cliSessionId: randomUUID(),
      closed: false,
      eventBuffer: [],
      handoffSpec: input.handoff,
      invocationCount: 0,
      session,
      sessionId,
      startedEventEmitted: false,
      subscribers: new Set(),
      work: Promise.resolve(),
      workingDirectory: input.cwd,
    };

    this.#sessions.set(sessionId, sessionState);
    void this.#queuePrompt(sessionState, input, createClaudePrompt(input)).catch(() => undefined);

    return {
      get session() {
        return sessionState.session;
      },
      get sessionId() {
        return sessionState.sessionId;
      },
      sendMessage: async (message) => this.#sendMessage(sessionState.sessionId, input, message),
      interrupt: async () => this.#interruptSession(sessionState.sessionId),
      terminate: async () => this.#terminateSession(sessionState.sessionId),
      collectArtifacts: async () => [...sessionState.artifacts],
    };
  }

  async streamEvents(
    sessionId: AgentSession["sessionId"],
    onEvent: AgentEventSubscriber,
  ): Promise<Unsubscribe> {
    const sessionState = this.#sessions.get(sessionId);

    if (sessionState === undefined) {
      throw new Error(`Unknown Claude session: ${sessionId}`);
    }

    sessionState.subscribers.add(onEvent);

    for (const event of sessionState.eventBuffer) {
      onEvent(event);
    }

    return () => {
      sessionState.subscribers.delete(onEvent);
    };
  }

  #emitEvent(sessionState: ClaudeSessionState, event: AgentStreamEvent): void {
    sessionState.eventBuffer.push(event);

    for (const subscriber of sessionState.subscribers) {
      subscriber(event);
    }
  }

  #recordArtifact(sessionState: ClaudeSessionState, artifact: Artifact): void {
    sessionState.artifacts.push(artifact);
    this.#emitEvent(sessionState, {
      type: "artifact.recorded",
      timestamp: artifact.createdAt,
      runId: sessionState.session.runId,
      artifact,
    });
  }

  #updateSessionStatus(sessionState: ClaudeSessionState, nextStatus: AgentSessionStatus): void {
    const previousStatus = sessionState.session.status;

    if (previousStatus === nextStatus) {
      return;
    }

    sessionState.session = {
      ...sessionState.session,
      status: nextStatus,
      ...(nextStatus === "running" || nextStatus === "pending"
        ? {}
        : { endedAt: createTimestamp() }),
    };

    this.#emitEvent(
      sessionState,
      createSessionStatusEvent(sessionState.sessionId, previousStatus, nextStatus),
    );
    const event = {
      type: "agent.session.status.changed",
      timestamp: createTimestamp(),
      runId: sessionState.session.runId,
      sessionId: sessionState.sessionId,
      nextStatus,
    } as const;

    this.#emitEvent(
      sessionState,
      previousStatus === undefined ? event : { ...event, previousStatus },
    );
  }

  #emitStartedEvent(sessionState: ClaudeSessionState): void {
    if (sessionState.startedEventEmitted) {
      return;
    }

    sessionState.startedEventEmitted = true;
    this.#emitEvent(sessionState, {
      type: "agent.session.started",
      timestamp: createTimestamp(),
      runId: sessionState.session.runId,
      session: sessionState.session,
    });
  }

  #queuePrompt(
    sessionState: ClaudeSessionState,
    input: StartAgentSessionInput,
    prompt: string,
  ): Promise<void> {
    const isResume = sessionState.invocationCount > 0;
    const previousWork = sessionState.work.catch(() => undefined);
    const work = previousWork.then(() => this.#runPrompt(sessionState, input, prompt, isResume));
    sessionState.work = work;
    return work;
  }

  async #sendMessage(
    sessionId: AgentSession["sessionId"],
    input: StartAgentSessionInput,
    message: string,
  ): Promise<void> {
    const sessionState = this.#sessions.get(sessionId);

    if (sessionState === undefined) {
      throw new Error(`Unknown Claude session: ${sessionId}`);
    }

    if (sessionState.closed) {
      throw new Error("Claude session is closed and cannot receive more messages.");
    }

    await this.#queuePrompt(
      sessionState,
      input,
      createClaudePrompt({ ...input, prompt: message.trim() }),
    );
  }

  async #interruptSession(sessionId: AgentSession["sessionId"]): Promise<void> {
    const sessionState = this.#sessions.get(sessionId);
    const activeProcess = sessionState?.activeProcess;

    if (sessionState === undefined || activeProcess === undefined) {
      return;
    }

    activeProcess.kill("SIGINT");
  }

  async #terminateSession(sessionId: AgentSession["sessionId"]): Promise<void> {
    const sessionState = this.#sessions.get(sessionId);

    if (sessionState === undefined) {
      return;
    }

    sessionState.closed = true;

    if (sessionState.activeProcess !== undefined) {
      await terminateProcess(sessionState.activeProcess, PROCESS_TERMINATION_TIMEOUT_MS);
      await Promise.race([
        sessionState.work.catch(() => undefined),
        createDelay(PROCESS_TERMINATION_TIMEOUT_MS),
      ]);
    }

    if (sessionState.session.status === "pending" || sessionState.session.status === "running") {
      this.#updateSessionStatus(sessionState, "interrupted");
    }
  }

  async #runPrompt(
    sessionState: ClaudeSessionState,
    input: StartAgentSessionInput,
    prompt: string,
    isResume: boolean,
  ): Promise<void> {
    sessionState.invocationCount += 1;
    const executionState: ClaudeExecutionState = {
      invocationCount: sessionState.invocationCount,
      interruptionRequested: false,
      streamState: createClaudeJsonStreamState(),
      stderr: "",
      stdout: "",
      terminationRequested: false,
    };

    const args = createClaudeArgs(
      input,
      sessionState.cliSessionId,
      prompt,
      resolveAdditionalDirectories(input.cwd, input.allowedPaths),
      isResume,
    );

    const childProcess = spawn(this.#executablePath, args, {
      cwd: sessionState.workingDirectory,
      stdio: ["ignore", "pipe", "pipe"],
    });

    sessionState.activeProcess = childProcess;
    this.#updateSessionStatus(sessionState, "running");
    this.#emitStartedEvent(sessionState);

    await new Promise<void>((resolveRun, rejectRun) => {
      childProcess.stdout.setEncoding("utf8");
      childProcess.stderr.setEncoding("utf8");

      childProcess.stdout.on("data", (chunk: string) => {
        executionState.stdout += chunk;
        consumeClaudeStdoutChunk(executionState.streamState, chunk);
        this.#emitEvent(
          sessionState,
          createStreamChunk("stdout", sessionState.session.runId, sessionState.sessionId, chunk),
        );
      });

      childProcess.stderr.on("data", (chunk: string) => {
        executionState.stderr += chunk;
        this.#emitEvent(
          sessionState,
          createStreamChunk("stderr", sessionState.session.runId, sessionState.sessionId, chunk),
        );
      });

      childProcess.on("error", (error) => {
        this.#emitEvent(
          sessionState,
          createStreamChunk(
            "stderr",
            sessionState.session.runId,
            sessionState.sessionId,
            `${error.message}\n`,
          ),
        );
        sessionState.activeProcess = undefined;
        this.#updateSessionStatus(sessionState, "failed");
        rejectRun(error);
      });

      childProcess.on("spawn", () => {
        executionState.interruptionRequested = false;
        executionState.terminationRequested = false;
      });

      childProcess.on("exit", (_code, signal) => {
        if (signal === "SIGINT") {
          executionState.interruptionRequested = true;
        }

        if (signal === "SIGTERM" || signal === "SIGKILL") {
          executionState.terminationRequested = true;
        }
      });

      childProcess.on("close", (code, signal) => {
        sessionState.activeProcess = undefined;
        flushClaudeStdoutBuffer(executionState.streamState);

        this.#recordOutputArtifacts(sessionState, executionState);
        this.#recordHandoffArtifact(sessionState, executionState);

        if (
          signal === "SIGINT" ||
          signal === "SIGTERM" ||
          signal === "SIGKILL" ||
          executionState.interruptionRequested ||
          executionState.terminationRequested
        ) {
          this.#updateSessionStatus(sessionState, "interrupted");
          rejectRun(new Error(`Claude session interrupted for ${sessionState.sessionId}.`));
          return;
        }

        if (code === 0) {
          this.#updateSessionStatus(sessionState, "completed");
          resolveRun();
          return;
        }

        this.#updateSessionStatus(sessionState, "failed");
        const exitErr = new Error(
          `Claude exited with code ${code ?? "unknown"}.`,
        ) as ClaudeExitError;
        exitErr.exitCode = code ?? null;
        exitErr.signal = signal ?? null;
        exitErr.stderrSnippet = executionState.stderr.slice(-2000) || null;
        rejectRun(exitErr);
      });
    });
  }

  #recordOutputArtifacts(
    sessionState: ClaudeSessionState,
    executionState: ClaudeExecutionState,
  ): void {
    const createdAt = createTimestamp();

    if (executionState.stdout.trim().length > 0) {
      this.#recordArtifact(sessionState, {
        artifactId: createEntityId("artifact", randomUUID()),
        runId: sessionState.session.runId,
        sessionId: sessionState.sessionId,
        kind: "log",
        label: `claude-stdout-${executionState.invocationCount}`,
        contentType: "application/x-ndjson",
        createdAt,
      });
    }

    if (executionState.stderr.trim().length > 0) {
      this.#recordArtifact(sessionState, {
        artifactId: createEntityId("artifact", randomUUID()),
        runId: sessionState.session.runId,
        sessionId: sessionState.sessionId,
        kind: "log",
        label: `claude-stderr-${executionState.invocationCount}`,
        contentType: "text/plain",
        createdAt,
      });
    }
  }

  #recordHandoffArtifact(
    sessionState: ClaudeSessionState,
    executionState: ClaudeExecutionState,
  ): void {
    const rawText = selectBestResponseText(
      executionState.streamState.textCandidates,
      sessionState.handoffSpec,
    );

    if (rawText === undefined) {
      return;
    }

    const handoff = parseStructuredHandoff(rawText, sessionState.handoffSpec);

    if (handoff === null) {
      return;
    }

    const createdAt = createTimestamp();
    this.#recordArtifact(sessionState, {
      artifactId: createEntityId("artifact", randomUUID()),
      runId: sessionState.session.runId,
      sessionId: sessionState.sessionId,
      kind: "handoff",
      label: `claude-handoff-${executionState.invocationCount}`,
      contentType: "text/plain",
      createdAt,
    });

    this.#emitEvent(sessionState, {
      type: "handoff",
      sessionId: sessionState.sessionId,
      handoff,
      rawText,
      timestamp: createdAt,
    });
    this.#emitEvent(sessionState, {
      type: "agent.handoff.received",
      timestamp: createdAt,
      runId: sessionState.session.runId,
      handoff,
      session: sessionState.session,
    });
  }
}
