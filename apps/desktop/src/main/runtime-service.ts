import type {
  CreateTaskInput,
  OrchestrationRuntime,
  ResolveApprovalInput,
  RetryRunInput,
  RuntimeSubscription,
  StartRunInput,
  StartRunResult,
} from "@iamrobot/orchestration";
import type {
  ApprovalRequest,
  DomainEvent,
  Run,
  RunId,
  RuntimeRunDetails,
  RuntimeSnapshot,
  Task,
} from "@iamrobot/protocol";

type SnapshotSubscriber = (snapshot: RuntimeSnapshot) => void;
type RunSubscriber = (event: DomainEvent) => void;

export interface DesktopRuntimeService {
  listRuns(): Promise<RuntimeSnapshot>;
  getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null>;
  createTask(input: CreateTaskInput): Promise<Task>;
  startRun(input: StartRunInput): Promise<StartRunResult>;
  resolveApproval(input: ResolveApprovalInput): Promise<ApprovalRequest | null>;
  retryRun(input: RetryRunInput): Promise<Run | null>;
  cancelRun(runId: RunId): Promise<Run | null>;
  subscribeToSnapshot(onSnapshot: SnapshotSubscriber): Promise<RuntimeSubscription>;
  subscribeToRun(runId: RunId, onEvent: RunSubscriber): Promise<RuntimeSubscription>;
}

export class DefaultDesktopRuntimeService implements DesktopRuntimeService {
  private readonly snapshotSubscribers = new Set<SnapshotSubscriber>();
  private readonly runSubscribers = new Map<RunId, Set<RunSubscriber>>();
  private readonly watchedRuns = new Map<RunId, RuntimeSubscription>();

  constructor(private readonly runtime: OrchestrationRuntime) {}

  listRuns(): Promise<RuntimeSnapshot> {
    return this.runtime.listRuns();
  }

  getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null> {
    return this.runtime.getRunDetails(runId);
  }

  createTask(input: CreateTaskInput): Promise<Task> {
    return this.runtime.createTask(input);
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

    for (const event of details.events) {
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
      void this.publishSnapshot();
    });

    this.watchedRuns.set(runId, unsubscribe);
  }

  private publishRunEvent(runId: RunId, event: DomainEvent): void {
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
}
