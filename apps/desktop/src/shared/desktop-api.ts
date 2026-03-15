import type {
  CreateProjectInput,
  CreateTaskInput,
  ResolveApprovalInput,
  RetryRunInput,
  StartRunInput,
  StartRunResult,
} from "@iamrobot/orchestration";
import type {
  ApprovalRequest,
  Project,
  Run,
  RunId,
  RuntimeRunDetails,
  RuntimeRunEvent,
  RuntimeSnapshot,
  Task,
} from "@iamrobot/protocol";

export const desktopIpcChannels = {
  cancelRun: "desktop-runtime:cancel-run",
  createProject: "desktop-runtime:create-project",
  createTask: "desktop-runtime:create-task",
  getRunDetails: "desktop-runtime:get-run-details",
  getHeartbeatMode: "desktop-runtime:get-heartbeat-mode",
  listRuns: "desktop-runtime:list-runs",
  resolveApproval: "desktop-runtime:resolve-approval",
  retryRun: "desktop-runtime:retry-run",
  runEvent: "desktop-runtime:run-event",
  selectDirectory: "desktop-runtime:select-directory",
  selectProject: "desktop-runtime:select-project",
  setHeartbeatMode: "desktop-runtime:set-heartbeat-mode",
  startRun: "desktop-runtime:start-run",
  subscribeToRun: "desktop-runtime:subscribe-run",
  subscribeToSnapshot: "desktop-runtime:subscribe-snapshot",
  snapshotEvent: "desktop-runtime:snapshot",
  unsubscribe: "desktop-runtime:unsubscribe",
} as const;

export type DesktopSubscription = () => void;
export type DesktopRunEventSubscriber = (event: RuntimeRunEvent) => void;
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
  readonly event: RuntimeRunEvent;
}

export interface DesktopApi {
  listRuns(): Promise<RuntimeSnapshot>;
  getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null>;
  createProject(input: CreateProjectInput): Promise<Project>;
  createTask(input: CreateTaskInput): Promise<Task>;
  selectProject(projectId: Project["projectId"]): Promise<Project | null>;
  startRun(input: StartRunInput): Promise<StartRunResult>;
  resolveApproval(input: ResolveApprovalInput): Promise<ApprovalRequest | null>;
  retryRun(input: RetryRunInput): Promise<Run | null>;
  cancelRun(runId: RunId): Promise<Run | null>;
  selectDirectory(): Promise<string | null>;
  subscribeToSnapshot(onSnapshot: DesktopSnapshotSubscriber): Promise<DesktopSubscription>;
  subscribeToRun(runId: RunId, onEvent: DesktopRunEventSubscriber): Promise<DesktopSubscription>;
  setHeartbeatMode(enabled: boolean): Promise<void>;
  getHeartbeatMode(): Promise<boolean>;
}
