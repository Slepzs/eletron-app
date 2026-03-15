import type {
  CreateProjectInput,
  CreateTaskInput,
  OrchestrationRuntime,
  ResolveApprovalInput,
  RetryRunInput,
  RuntimeSubscription,
  StartRunInput,
  StartRunResult,
} from "@iamrobot/orchestration";
import {
  type AgentOutputChunk,
  type ApprovalRequest,
  MAX_LIVE_OUTPUT_CHUNKS,
  type Project,
  REPLAY_CHECKPOINT_INTERVAL,
  type Run,
  type RunId,
  type RuntimeRunDetails,
  type RuntimeRunEvent,
  type RuntimeSnapshot,
  type Task,
} from "@iamrobot/protocol";

import type { RunOutputReplayStore } from "./run-output-replay-store.js";

type SnapshotSubscriber = (snapshot: RuntimeSnapshot) => void;
type RunSubscriber = (event: RuntimeRunEvent) => void;

export interface DesktopRuntimeService {
  listRuns(): Promise<RuntimeSnapshot>;
  getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null>;
  createProject(input: CreateProjectInput): Promise<Project>;
  createTask(input: CreateTaskInput): Promise<Task>;
  selectProject(projectId: Project["projectId"]): Promise<Project | null>;
  startRun(input: StartRunInput): Promise<StartRunResult>;
  resolveApproval(input: ResolveApprovalInput): Promise<ApprovalRequest | null>;
  retryRun(input: RetryRunInput): Promise<Run | null>;
  cancelRun(runId: RunId): Promise<Run | null>;
  subscribeToSnapshot(onSnapshot: SnapshotSubscriber): Promise<RuntimeSubscription>;
  subscribeToRun(runId: RunId, onEvent: RunSubscriber): Promise<RuntimeSubscription>;
  setHeartbeatMode(enabled: boolean): Promise<void>;
  getHeartbeatMode(): Promise<boolean>;
}

export class DefaultDesktopRuntimeService implements DesktopRuntimeService {
  private readonly runEventHistory = new Map<RunId, RuntimeRunEvent[]>();
  private readonly snapshotSubscribers = new Set<SnapshotSubscriber>();
  private readonly runSubscribers = new Map<RunId, Set<RunSubscriber>>();
  private readonly watchedRuns = new Map<RunId, RuntimeSubscription>();
  private readonly replayCheckpointCursor = new Map<RunId, number>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly runtime: OrchestrationRuntime,
    private readonly runOutputReplayStore: RunOutputReplayStore,
  ) {}

  listRuns(): Promise<RuntimeSnapshot> {
    return this.runtime.listRuns();
  }

  getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null> {
    return this.runtime.getRunDetails(runId);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const project = await this.runtime.createProject(input);

    await this.publishSnapshot();

    return project;
  }

  createTask(input: CreateTaskInput): Promise<Task> {
    return this.runtime.createTask(input);
  }

  async selectProject(projectId: Project["projectId"]): Promise<Project | null> {
    const project = await this.runtime.selectProject(projectId);

    await this.publishSnapshot();

    return project;
  }

  async startRun(input: StartRunInput): Promise<StartRunResult> {
    const result = await this.runtime.startRun(input);

    await this.ensureRunWatcher(result.run.runId);
    await this.publishSnapshot();

    return result;
  }

  async resolveApproval(input: ResolveApprovalInput): Promise<ApprovalRequest | null> {
    const approvalRequest = await this.runtime.resolveApproval(input);

    await this.publishSnapshot();

    return approvalRequest;
  }

  async retryRun(input: RetryRunInput): Promise<Run | null> {
    const run = await this.runtime.retryRun(input);

    if (run !== null) {
      await this.ensureRunWatcher(run.runId);
      await this.publishSnapshot();
    }

    return run;
  }

  async cancelRun(runId: RunId): Promise<Run | null> {
    const run = await this.runtime.cancelRun(runId);

    await this.publishSnapshot();

    return run;
  }

  async setHeartbeatMode(enabled: boolean): Promise<void> {
    if (enabled) {
      this.runtime.enableHeartbeat();
      if (this.heartbeatInterval === null) {
        this.heartbeatInterval = setInterval(() => {
          void this.publishSnapshot();
        }, 5000);
      }
    } else {
      this.runtime.disableHeartbeat();
      if (this.heartbeatInterval !== null) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }
  }

  getHeartbeatMode(): Promise<boolean> {
    return Promise.resolve(this.runtime.isHeartbeatEnabled());
  }

  async subscribeToSnapshot(onSnapshot: SnapshotSubscriber): Promise<RuntimeSubscription> {
    this.snapshotSubscribers.add(onSnapshot);
    onSnapshot(await this.runtime.listRuns());

    return () => {
      this.snapshotSubscribers.delete(onSnapshot);
    };
  }

  async subscribeToRun(runId: RunId, onEvent: RunSubscriber): Promise<RuntimeSubscription> {
    const details = await this.runtime.getRunDetails(runId);

    if (details === null) {
      throw new Error(`Unknown run: ${runId}`);
    }

    const existingHistory = this.runEventHistory.get(runId);
    const initialEvents =
      existingHistory ??
      mergeRunEvents(details.events, await this.runOutputReplayStore.load(details));

    if (existingHistory === undefined) {
      this.runEventHistory.set(runId, [...initialEvents]);
    }

    if (!this.replayCheckpointCursor.has(runId)) {
      this.replayCheckpointCursor.set(runId, countOutputChunks(initialEvents));
    }

    for (const event of initialEvents) {
      onEvent(event);
    }

    const subscribers = this.runSubscribers.get(runId) ?? new Set<RunSubscriber>();
    subscribers.add(onEvent);
    this.runSubscribers.set(runId, subscribers);

    await this.ensureRunWatcher(runId, details.events.length);

    return () => {
      const currentSubscribers = this.runSubscribers.get(runId);

      if (currentSubscribers === undefined) {
        return;
      }

      currentSubscribers.delete(onEvent);

      if (currentSubscribers.size === 0) {
        this.runSubscribers.delete(runId);
      }
    };
  }

  private async ensureRunWatcher(runId: RunId, replayedEventCount = 0): Promise<void> {
    if (this.watchedRuns.has(runId)) {
      return;
    }

    let ignoredReplayEvents = replayedEventCount;

    const unsubscribe = await this.runtime.subscribeToRun(runId, (event) => {
      if (ignoredReplayEvents > 0) {
        ignoredReplayEvents -= 1;
        return;
      }

      this.publishRunEvent(runId, event);

      if (isDomainEvent(event)) {
        void this.publishSnapshot();
      }

      if (shouldPersistRunOutputReplay(event)) {
        void this.persistRunOutputReplay(runId);
      } else if (isAgentOutputChunk(event)) {
        const currentChunkCount = countOutputChunks(this.runEventHistory.get(runId));
        const lastCursor = this.replayCheckpointCursor.get(runId) ?? 0;

        if (currentChunkCount - lastCursor >= REPLAY_CHECKPOINT_INTERVAL) {
          this.replayCheckpointCursor.set(runId, currentChunkCount);
          void this.persistRunOutputReplay(runId);
        }
      }

      if (isTerminalRunEvent(event)) {
        this.stopWatchingRun(runId);
      }
    });

    this.watchedRuns.set(runId, unsubscribe);
  }

  private publishRunEvent(runId: RunId, event: RuntimeRunEvent): void {
    const existingHistory = this.runEventHistory.get(runId);

    if (isDuplicateOutputChunk(existingHistory, event)) {
      return;
    }

    const history = appendRunEventHistory(existingHistory, event);
    this.runEventHistory.set(runId, history);

    const subscribers = this.runSubscribers.get(runId);

    if (subscribers === undefined) {
      return;
    }

    for (const subscriber of subscribers) {
      subscriber(event);
    }
  }

  private async publishSnapshot(): Promise<void> {
    if (this.snapshotSubscribers.size === 0) {
      return;
    }

    const snapshot = await this.runtime.listRuns();

    for (const subscriber of this.snapshotSubscribers) {
      subscriber(snapshot);
    }
  }

  private stopWatchingRun(runId: RunId): void {
    const unsubscribe = this.watchedRuns.get(runId);

    if (!unsubscribe) {
      return;
    }

    unsubscribe();
    this.watchedRuns.delete(runId);
    this.replayCheckpointCursor.delete(runId);
  }

  private async persistRunOutputReplay(runId: RunId): Promise<void> {
    const outputChunks = this.runEventHistory.get(runId)?.filter(isAgentOutputChunk) ?? [];
    const didPersist = await this.runOutputReplayStore.save(runId, outputChunks);

    if (didPersist) {
      this.replayCheckpointCursor.set(runId, outputChunks.length);
      await this.publishSnapshot();
    }
  }
}

function isDomainEvent(event: RuntimeRunEvent): boolean {
  return event.type !== "stdout" && event.type !== "stderr";
}

function appendRunEventHistory(
  existingHistory: readonly RuntimeRunEvent[] | undefined,
  event: RuntimeRunEvent,
): RuntimeRunEvent[] {
  const history = existingHistory ? [...existingHistory, event] : [event];
  const domainEvents = history.filter(isDomainEvent);
  const outputChunks = history.filter(isAgentOutputChunk);

  return [...domainEvents, ...outputChunks.slice(-MAX_LIVE_OUTPUT_CHUNKS)].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  );
}

function mergeRunEvents(
  domainEvents: RuntimeRunDetails["events"],
  outputChunks: readonly AgentOutputChunk[],
): RuntimeRunEvent[] {
  const history = [...domainEvents, ...outputChunks];
  const replayedDomainEvents = history.filter(isDomainEvent);
  const replayedOutputChunks = history.filter(isAgentOutputChunk);

  return [...replayedDomainEvents, ...replayedOutputChunks.slice(-MAX_LIVE_OUTPUT_CHUNKS)].sort(
    (left, right) => left.timestamp.localeCompare(right.timestamp),
  );
}

function isAgentOutputChunk(event: RuntimeRunEvent): event is AgentOutputChunk {
  return event.type === "stdout" || event.type === "stderr";
}

function isDuplicateOutputChunk(
  history: readonly RuntimeRunEvent[] | undefined,
  event: RuntimeRunEvent,
): boolean {
  if (!isAgentOutputChunk(event) || history === undefined) {
    return false;
  }

  return history.some(
    (candidate) =>
      isAgentOutputChunk(candidate) &&
      candidate.type === event.type &&
      candidate.runId === event.runId &&
      candidate.sessionId === event.sessionId &&
      candidate.timestamp === event.timestamp &&
      candidate.content === event.content,
  );
}

function countOutputChunks(events: readonly RuntimeRunEvent[] | undefined): number {
  return events?.filter(isAgentOutputChunk).length ?? 0;
}

function shouldPersistRunOutputReplay(event: RuntimeRunEvent): boolean {
  return (
    event.type === "run.status.changed" &&
    (event.nextStatus === "blocked" ||
      event.nextStatus === "failed" ||
      event.nextStatus === "succeeded")
  );
}

function isTerminalRunEvent(event: RuntimeRunEvent): boolean {
  return (
    event.type === "run.status.changed" &&
    (event.nextStatus === "failed" || event.nextStatus === "succeeded")
  );
}
