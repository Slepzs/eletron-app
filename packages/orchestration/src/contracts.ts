import type {
  AgentRoleAssignments,
  ApprovalDecision,
  ApprovalRequest,
  DomainEvent,
  Run,
  RunId,
  RuntimeRunDetails,
  RuntimeSnapshot,
  Task,
} from "@iamrobot/protocol";
import type { VerificationProfile } from "@iamrobot/verification";

export interface CreateTaskInput {
  readonly repoPath: string;
  readonly baseBranch: string;
  readonly goal: string;
  readonly constraints?: readonly string[];
  readonly acceptanceCriteria?: readonly string[];
  readonly allowedPaths?: readonly string[];
  readonly verificationProfile?: VerificationProfile;
}

export interface CreateRunInput {
  readonly task: Task;
  readonly maxAttempts?: number;
}

export interface StartRunInput extends CreateRunInput {
  readonly roleAssignments?: AgentRoleAssignments;
}

export interface RetryRunInput {
  readonly runId: RunId;
  readonly reason: string;
}

export interface ResolveApprovalInput {
  readonly approvalRequestId: ApprovalRequest["approvalRequestId"];
  readonly decision: Exclude<ApprovalDecision, "pending">;
}

export interface StartRunResult {
  readonly task: Task;
  readonly run: Run;
}

export type RuntimeEventSubscriber = (event: DomainEvent) => void;
export type RuntimeSubscription = () => void;

export interface OrchestrationRuntime {
  createTask(input: CreateTaskInput): Promise<Task>;
  startRun(input: StartRunInput): Promise<StartRunResult>;
  listRuns(): Promise<RuntimeSnapshot>;
  getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null>;
  subscribeToRun(runId: RunId, onEvent: RuntimeEventSubscriber): Promise<RuntimeSubscription>;
  resolveApproval(input: ResolveApprovalInput): Promise<ApprovalRequest | null>;
  retryRun(input: RetryRunInput): Promise<Run | null>;
  cancelRun(runId: RunId): Promise<Run | null>;
}
