import type {
  CreateTaskInput,
  ResolveApprovalInput,
  RetryRunInput,
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

import type { DesktopSeedState } from "./seed-state";

export const desktopIpcChannels = {
  cancelRun: "desktop-runtime:cancel-run",
  createTask: "desktop-runtime:create-task",
  getRunDetails: "desktop-runtime:get-run-details",
  listRuns: "desktop-runtime:list-runs",
  resolveApproval: "desktop-runtime:resolve-approval",
  retryRun: "desktop-runtime:retry-run",
  runEvent: "desktop-runtime:run-event",
  startRun: "desktop-runtime:start-run",
  subscribeToRun: "desktop-runtime:subscribe-run",
  subscribeToSnapshot: "desktop-runtime:subscribe-snapshot",
  snapshotEvent: "desktop-runtime:snapshot",
  unsubscribe: "desktop-runtime:unsubscribe",
} as const;

export type DesktopSubscription = () => void;
export type DesktopRunEventSubscriber = (event: DomainEvent) => void;
export type DesktopSnapshotSubscriber = (snapshot: RuntimeSnapshot) => void;

export interface DesktopSnapshotSubscriptionInput {
  readonly subscriptionId: string;
}

export interface DesktopRunSubscriptionInput extends DesktopSnapshotSubscriptionInput {
  readonly runId: RunId;
}

export interface DesktopSubscriptionDisposeInput {
  readonly subscriptionId: string;
}

export interface DesktopSnapshotEventPayload {
  readonly subscriptionId: string;
  readonly snapshot: RuntimeSnapshot;
}

export interface DesktopRunEventPayload {
  readonly subscriptionId: string;
  readonly event: DomainEvent;
}

export interface DesktopApi {
  getSeedState(): DesktopSeedState;
  listRuns(): Promise<RuntimeSnapshot>;
  getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null>;
  createTask(input: CreateTaskInput): Promise<Task>;
  startRun(input: StartRunInput): Promise<StartRunResult>;
  resolveApproval(input: ResolveApprovalInput): Promise<ApprovalRequest | null>;
  retryRun(input: RetryRunInput): Promise<Run | null>;
  cancelRun(runId: RunId): Promise<Run | null>;
  subscribeToSnapshot(onSnapshot: DesktopSnapshotSubscriber): Promise<DesktopSubscription>;
  subscribeToRun(runId: RunId, onEvent: DesktopRunEventSubscriber): Promise<DesktopSubscription>;
}
