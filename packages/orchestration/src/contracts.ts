import type { AgentAdapter } from "@iamrobot/agent-sdk";
import type { PersistenceStore } from "@iamrobot/db";
import type { PreparedWorktree, PrepareWorktreeInput } from "@iamrobot/git";
import type {
  AgentRoleAssignments,
  ApprovalDecision,
  ApprovalKind,
  ApprovalRequest,
  Project,
  Run,
  RunId,
  RuntimeRunDetails,
  RuntimeRunEvent,
  RuntimeSnapshot,
  StructuredHandoff,
  StructuredHandoffSpec,
  Task,
  Verdict,
  VerificationResult,
} from "@iamrobot/protocol";
import type { VerificationProfile, VerificationRunner } from "@iamrobot/verification";

export interface CreateTaskInput {
  readonly repoPath: string;
  readonly baseBranch: string;
  readonly goal: string;
  readonly constraints?: readonly string[];
  readonly acceptanceCriteria?: readonly string[];
  readonly allowedPaths?: readonly string[];
  readonly verificationProfile?: Task["verificationProfile"];
}

export interface CreateProjectInput {
  readonly name: Project["name"];
  readonly repoPath: Project["repoPath"];
  readonly defaultBaseBranch: Project["defaultBaseBranch"];
  readonly defaultAllowedPaths?: Project["defaultAllowedPaths"];
  readonly verificationProfile?: Project["verificationProfile"];
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

export interface RuntimeWorktreeClient {
  prepare(input: PrepareWorktreeInput): Promise<PreparedWorktree>;
}

export interface RuntimeApprovalDraft {
  readonly kind: ApprovalKind;
  readonly title: string;
  readonly description: string;
}

export interface RuntimePolicyContext {
  readonly run: Run;
  readonly task: Task;
  readonly stage: Run["stage"];
}

export type RuntimePolicyHook =
  | ((
      context: RuntimePolicyContext,
    ) => RuntimeApprovalDraft | null | Promise<RuntimeApprovalDraft | null>)
  | undefined;

export interface RuntimePolicyHooks {
  readonly beforePlanning?: RuntimePolicyHook;
  readonly beforeImplementing?: RuntimePolicyHook;
  readonly beforeReviewing?: RuntimePolicyHook;
  readonly beforeVerifying?: RuntimePolicyHook;
}

export interface RuntimeContextSnapshot {
  readonly task: Task;
  readonly run: Run;
  readonly planningHandoff?: StructuredHandoff;
  readonly implementationHandoff?: StructuredHandoff;
  readonly reviewHandoff?: StructuredHandoff;
  readonly verificationResult?: VerificationResult;
  readonly latestVerdict?: Verdict;
}

export interface CreateOrchestrationRuntimeOptions {
  readonly adapters: readonly AgentAdapter[];
  readonly store: PersistenceStore;
  readonly verificationRunner: VerificationRunner;
  readonly verificationProfiles?: readonly VerificationProfile[];
  readonly worktrees: RuntimeWorktreeClient;
  readonly handoffSpec?: StructuredHandoffSpec;
  readonly createApprovalRequestId?: () => ApprovalRequest["approvalRequestId"];
  readonly createTimestamp?: () => string;
  readonly policyHooks?: RuntimePolicyHooks;
}

export type RuntimeEventSubscriber = (event: RuntimeRunEvent) => void;
export type RuntimeSubscription = () => void;

export interface OrchestrationRuntime {
  createProject(input: CreateProjectInput): Promise<Project>;
  createTask(input: CreateTaskInput): Promise<Task>;
  selectProject(projectId: Project["projectId"]): Promise<Project | null>;
  startRun(input: StartRunInput): Promise<StartRunResult>;
  listRuns(): Promise<RuntimeSnapshot>;
  getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null>;
  subscribeToRun(runId: RunId, onEvent: RuntimeEventSubscriber): Promise<RuntimeSubscription>;
  resolveApproval(input: ResolveApprovalInput): Promise<ApprovalRequest | null>;
  retryRun(input: RetryRunInput): Promise<Run | null>;
  cancelRun(runId: RunId): Promise<Run | null>;
  enableHeartbeat(): void;
  disableHeartbeat(): void;
  isHeartbeatEnabled(): boolean;
}
