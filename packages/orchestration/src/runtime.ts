import { randomUUID } from "node:crypto";

import type {
  AgentAdapter,
  AgentSessionHandle,
  AgentStreamEvent,
  StartAgentSessionInput,
} from "@iamrobot/agent-sdk";
import type { PreparedWorktree } from "@iamrobot/git";
import type {
  AgentKind,
  AgentOutputChunk,
  AgentRole,
  AgentSession,
  ApprovalRequest,
  DomainEvent,
  FailureContext,
  Project,
  Run,
  RunId,
  RunStage,
  RuntimeRunDetails,
  RuntimeRunEvent,
  RuntimeSnapshot,
  StructuredHandoff,
  Task,
  Verdict,
  VerificationResult,
} from "@iamrobot/protocol";
import {
  createDefaultStructuredHandoffSpec,
  createEntityId,
  createTimestamp,
  MAX_LIVE_OUTPUT_CHUNKS,
} from "@iamrobot/protocol";
import { createDefaultVerificationProfile, type VerificationProfile } from "@iamrobot/verification";

import type {
  CreateOrchestrationRuntimeOptions,
  CreateProjectInput,
  CreateTaskInput,
  OrchestrationRuntime,
  ResolveApprovalInput,
  RetryRunInput,
  RuntimeEventSubscriber,
  RuntimePolicyContext,
  RuntimeSubscription,
  StartRunInput,
  StartRunResult,
} from "./contracts.js";
import {
  advanceRunStage,
  attachVerdict,
  createProjectDefinition,
  createRunRecord,
  createTaskDefinition,
  getDefaultRoleAssignments,
} from "./helpers.js";
import { buildImplementationPrompt, buildPlanningPrompt, buildReviewPrompt } from "./prompts.js";
import {
  createAcceptedVerdict,
  createCancelledVerdict,
  createReviewVerdict,
  createStageFailureVerdict,
  createVerificationFailureVerdict,
} from "./verdicts.js";

function stageToRole(stage: RunStage): AgentRole {
  if (stage === "planning") return "planner";
  if (stage === "reviewing") return "reviewer";
  return "implementer";
}

interface ActiveRunState {
  readonly task: Task;
  roleAssignments: ResolvedRoleAssignments;
  run: Run;
  planningHandoff: StructuredHandoff | undefined;
  implementationHandoff: StructuredHandoff | undefined;
  reviewHandoff: StructuredHandoff | undefined;
  verificationResult: VerificationResult | undefined;
  latestVerdict: Verdict | undefined;
  readonly activeSessions: Map<AgentRole, AgentSessionHandle>;
  readonly approvals: Map<ApprovalRequest["approvalRequestId"], PendingApproval>;
  readonly outputChunks: AgentOutputChunk[];
  readonly worktrees: Partial<Record<"implementer" | "planner", PreparedWorktree>>;
  cancelled: boolean;
}

interface PendingApproval {
  readonly runId: RunId;
  resolve(decision: ResolveApprovalInput["decision"]): void;
}

interface StageSessionResult {
  readonly handoff?: StructuredHandoff;
}

interface ResumeRunOptions {
  readonly run: Run;
  readonly task: Task;
  readonly roleAssignments: ResolvedRoleAssignments;
  readonly planningHandoff: StructuredHandoff | undefined;
  readonly implementationHandoff: StructuredHandoff | undefined;
  readonly reviewHandoff: StructuredHandoff | undefined;
  readonly verificationResult: VerificationResult | undefined;
  readonly latestVerdict: Verdict | undefined;
  readonly retryReason: string | undefined;
}

const TERMINAL_SESSION_STATUSES = new Set<AgentSession["status"]>([
  "completed",
  "failed",
  "interrupted",
]);

type ResolvedRoleAssignments = ReturnType<typeof getDefaultRoleAssignments>;

const DEFAULT_ROLE_ASSIGNMENTS = getDefaultRoleAssignments();

export function createOrchestrationRuntime(
  options: CreateOrchestrationRuntimeOptions,
): OrchestrationRuntime {
  return new DefaultOrchestrationRuntime(options);
}

class DefaultOrchestrationRuntime implements OrchestrationRuntime {
  private readonly adapters: ReadonlyMap<AgentKind, AgentAdapter>;
  private readonly createApprovalRequestId: () => ApprovalRequest["approvalRequestId"];
  private readonly createTimestamp: () => string;
  private readonly handoffSpec: ReturnType<typeof createDefaultStructuredHandoffSpec>;
  private readonly runSubscribers = new Map<RunId, Set<RuntimeEventSubscriber>>();
  private readonly verificationProfiles: Map<string, VerificationProfile>;
  private readonly activeRuns = new Map<RunId, ActiveRunState>();
  private heartbeatEnabled = false;

  constructor(private readonly options: CreateOrchestrationRuntimeOptions) {
    this.adapters = createAdapterMap(options.adapters);
    this.createApprovalRequestId =
      options.createApprovalRequestId ?? (() => createEntityId("approval-request", randomUUID()));
    this.createTimestamp = options.createTimestamp ?? (() => createTimestamp());
    this.handoffSpec = options.handoffSpec ?? createDefaultStructuredHandoffSpec();
    this.verificationProfiles = createVerificationProfileMap(options.verificationProfiles);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const existingProject = await this.options.store.projects.getByRepoPath(input.repoPath);

    if (existingProject !== null) {
      throw new Error(`A project already exists for ${input.repoPath}.`);
    }

    const project = createProjectDefinition(input);
    await this.options.store.projects.save(project);
    await this.options.store.preferences.setSelectedProjectId(project.projectId);
    return project;
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const task = createTaskDefinition(input);
    await this.options.store.tasks.save(task);
    return task;
  }

  async selectProject(projectId: Project["projectId"]): Promise<Project | null> {
    const project = await this.options.store.projects.getById(projectId);

    if (project === null) {
      return null;
    }

    await this.options.store.preferences.setSelectedProjectId(project.projectId);
    return project;
  }

  async startRun(input: StartRunInput): Promise<StartRunResult> {
    await this.assertNoActiveRun();

    await this.options.store.tasks.save(input.task);

    const run = createRunRecord(input);
    await this.options.store.runs.save(run);
    await this.recordEvent({
      type: "run.created",
      timestamp: this.createTimestamp(),
      run,
      task: input.task,
    });

    const roleAssignments = this.resolveRoleAssignments(input.roleAssignments);
    const state = this.createActiveRunState({
      run,
      task: input.task,
      roleAssignments,
      planningHandoff: undefined,
      implementationHandoff: undefined,
      reviewHandoff: undefined,
      verificationResult: undefined,
      latestVerdict: undefined,
    });

    this.activeRuns.set(run.runId, state);
    void this.executeRunLoop({
      run,
      task: input.task,
      roleAssignments,
      planningHandoff: undefined,
      implementationHandoff: undefined,
      reviewHandoff: undefined,
      verificationResult: undefined,
      latestVerdict: undefined,
      retryReason: undefined,
    });

    return {
      task: input.task,
      run,
    };
  }

  async listRuns(): Promise<RuntimeSnapshot> {
    return this.options.store.listRuns();
  }

  async getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null> {
    return this.options.store.getRunDetails(runId);
  }

  async subscribeToRun(
    runId: RunId,
    onEvent: RuntimeEventSubscriber,
  ): Promise<RuntimeSubscription> {
    const details = await this.options.store.getRunDetails(runId);

    if (!details) {
      throw new Error(`Unknown run: ${runId}`);
    }

    for (const event of getInitialRunEvents(
      details.events,
      this.activeRuns.get(runId)?.outputChunks,
    )) {
      onEvent(event);
    }

    const subscribers = this.runSubscribers.get(runId) ?? new Set<RuntimeEventSubscriber>();
    subscribers.add(onEvent);
    this.runSubscribers.set(runId, subscribers);

    return () => {
      const currentSubscribers = this.runSubscribers.get(runId);

      if (!currentSubscribers) {
        return;
      }

      currentSubscribers.delete(onEvent);

      if (currentSubscribers.size === 0) {
        this.runSubscribers.delete(runId);
      }
    };
  }

  async resolveApproval(input: ResolveApprovalInput): Promise<ApprovalRequest | null> {
    const approvalRequest = await this.options.store.approvalRequests.getById(
      input.approvalRequestId,
    );

    if (!approvalRequest || approvalRequest.decision !== "pending") {
      return approvalRequest;
    }

    const resolvedRequest: ApprovalRequest = {
      ...approvalRequest,
      decision: input.decision,
      resolvedAt: this.createTimestamp(),
    };

    await this.options.store.approvalRequests.save(resolvedRequest);
    await this.recordEvent({
      type: "approval.resolved",
      timestamp: this.createTimestamp(),
      runId: resolvedRequest.runId,
      approvalRequest: resolvedRequest,
    });

    this.activeRuns
      .get(resolvedRequest.runId)
      ?.approvals.get(resolvedRequest.approvalRequestId)
      ?.resolve(input.decision);

    return resolvedRequest;
  }

  async retryRun(input: RetryRunInput): Promise<Run | null> {
    const existingState = this.activeRuns.get(input.runId);

    if (
      existingState &&
      (existingState.activeSessions.size > 0 || existingState.approvals.size > 0)
    ) {
      throw new Error(`Run ${input.runId} is already active.`);
    }

    const details = await this.options.store.getRunDetails(input.runId);

    if (!details || details.run.status !== "blocked") {
      return details?.run ?? null;
    }

    const resumedRun = await this.persistRetriedRun({
      ...details.run,
      status: "in_progress",
      currentAttempt: details.run.currentAttempt + 1,
    });

    const roleAssignments = existingState?.roleAssignments ?? DEFAULT_ROLE_ASSIGNMENTS;
    const state =
      existingState ??
      this.createActiveRunState({
        run: resumedRun,
        task: details.task,
        roleAssignments,
        planningHandoff: getLatestHandoffByRole(details.events, "planner"),
        implementationHandoff: getLatestHandoffByRole(details.events, "implementer"),
        reviewHandoff: getLatestHandoffByRole(details.events, "reviewer"),
        verificationResult: details.latestVerificationResult,
        latestVerdict: details.latestVerdict,
      });

    state.run = resumedRun;
    state.cancelled = false;
    this.activeRuns.set(input.runId, state);
    void this.executeRunLoop({
      run: resumedRun,
      task: details.task,
      roleAssignments,
      planningHandoff: state.planningHandoff,
      implementationHandoff: state.implementationHandoff,
      reviewHandoff: state.reviewHandoff,
      verificationResult: state.verificationResult,
      latestVerdict: state.latestVerdict,
      retryReason: input.reason,
    });

    return resumedRun;
  }

  async cancelRun(runId: RunId): Promise<Run | null> {
    const activeState = this.activeRuns.get(runId);
    const details = await this.options.store.getRunDetails(runId);

    if (!details) {
      return null;
    }

    if (details.run.stage === "complete") {
      return details.run;
    }

    if (activeState) {
      activeState.cancelled = true;
    }

    await Promise.allSettled([
      ...details.approvalRequests
        .filter((approvalRequest) => approvalRequest.decision === "pending")
        .map((approvalRequest) =>
          this.resolveApproval({
            approvalRequestId: approvalRequest.approvalRequestId,
            decision: "rejected",
          }),
        ),
      ...(activeState
        ? [...activeState.activeSessions.values()].map((handle) => handle.terminate())
        : []),
    ]);

    const latestDetails = await this.options.store.getRunDetails(runId);

    if (!latestDetails) {
      this.activeRuns.delete(runId);
      return null;
    }

    if (latestDetails.run.stage === "complete") {
      this.activeRuns.delete(runId);
      return latestDetails.run;
    }

    const nextRun = await this.recordVerdictAndUpdateRun(
      latestDetails.run,
      createCancelledVerdict(),
    );

    this.activeRuns.delete(runId);
    return nextRun;
  }

  enableHeartbeat(): void {
    this.heartbeatEnabled = true;
  }

  disableHeartbeat(): void {
    this.heartbeatEnabled = false;
  }

  isHeartbeatEnabled(): boolean {
    return this.heartbeatEnabled;
  }

  private createActiveRunState(input: {
    readonly run: Run;
    readonly task: Task;
    readonly roleAssignments: ResolvedRoleAssignments;
    readonly planningHandoff: StructuredHandoff | undefined;
    readonly implementationHandoff: StructuredHandoff | undefined;
    readonly reviewHandoff: StructuredHandoff | undefined;
    readonly verificationResult: VerificationResult | undefined;
    readonly latestVerdict: Verdict | undefined;
  }): ActiveRunState {
    return {
      run: input.run,
      task: input.task,
      roleAssignments: input.roleAssignments,
      planningHandoff: input.planningHandoff,
      implementationHandoff: input.implementationHandoff,
      reviewHandoff: input.reviewHandoff,
      verificationResult: input.verificationResult,
      latestVerdict: input.latestVerdict,
      activeSessions: new Map(),
      approvals: new Map(),
      outputChunks: [],
      worktrees: {},
      cancelled: false,
    };
  }

  private async executeRunLoop(input: ResumeRunOptions): Promise<void> {
    const state = this.activeRuns.get(input.run.runId);

    if (!state) {
      return;
    }

    try {
      state.roleAssignments = input.roleAssignments;
      state.planningHandoff = input.planningHandoff;
      state.implementationHandoff = input.implementationHandoff;
      state.reviewHandoff = input.reviewHandoff;
      state.verificationResult = input.verificationResult;
      state.latestVerdict = input.latestVerdict;

      if (state.run.stage === "planning") {
        await this.enforceStagePolicy(state, "planning");
        const planningResult = await this.runPlanningStage(state);
        state.planningHandoff = planningResult.handoff;
        state.run = await this.transitionRunStage(state.run, "implementing");
      }

      if (state.run.stage === "implementing") {
        await this.enforceStagePolicy(state, "implementing");
        const implementationResult = await this.runImplementationStage(state, input.retryReason);
        state.implementationHandoff = implementationResult.handoff;
        state.run = await this.transitionRunStage(state.run, "reviewing");
      }

      if (state.run.stage === "reviewing") {
        await this.enforceStagePolicy(state, "reviewing");
        const reviewResult = await this.runReviewStage(state);
        state.reviewHandoff = reviewResult.handoff;

        if (reviewResult.handoff) {
          const reviewVerdict = createReviewVerdict(reviewResult.handoff, state.run);

          if (reviewVerdict) {
            state.latestVerdict = reviewVerdict;
            state.run = await this.recordVerdictAndUpdateRun(
              state.run,
              reviewVerdict,
              "implementing",
            );
            return;
          }
        }

        state.run = await this.transitionRunStage(state.run, "verifying");
      }

      if (state.run.stage === "verifying") {
        await this.enforceStagePolicy(state, "verifying");
        const verificationResult = await this.runVerificationStage(state);
        state.verificationResult = verificationResult;

        if (verificationResult.status === "failed") {
          const verificationVerdict = createVerificationFailureVerdict(
            verificationResult,
            state.run,
          );
          state.latestVerdict = verificationVerdict;
          state.run = await this.recordVerdictAndUpdateRun(
            state.run,
            verificationVerdict,
            "implementing",
          );
          return;
        }

        state.latestVerdict = createAcceptedVerdict(verificationResult);
        state.run = await this.recordVerdictAndUpdateRun(state.run, state.latestVerdict);
      }
    } catch (error) {
      if (state.cancelled) {
        return;
      }

      const failure = error instanceof Error ? error : new Error(String(error));
      const exitErr = failure as Partial<{
        exitCode: number | null;
        signal: string | null;
        stderrSnippet: string | null;
      }>;
      const failureContext: FailureContext = {
        exitCode: exitErr.exitCode ?? null,
        signal: exitErr.signal ?? null,
        errorMessage: failure.message,
        stackTrace: failure.stack ?? null,
        stderrSnippet: exitErr.stderrSnippet ?? null,
        stage: state.run.stage,
        role: stageToRole(state.run.stage),
      };
      state.latestVerdict = createStageFailureVerdict({
        run: state.run,
        stage: state.run.stage,
        role: stageToRole(state.run.stage),
        error: failure,
        failureContext,
      });
      const retryStage = state.run.stage === "planning" ? "planning" : "implementing";
      state.run = await this.recordVerdictAndUpdateRun(
        state.run,
        state.latestVerdict,
        state.latestVerdict.status === "needs_retry" ? retryStage : undefined,
      );
    } finally {
      if (state.run.stage === "complete" || state.cancelled) {
        this.activeRuns.delete(state.run.runId);
      }
    }
  }

  private async runPlanningStage(state: ActiveRunState): Promise<StageSessionResult> {
    const worktree = await this.getPlannerWorktree(state);

    return this.runStageSession(state, {
      role: "planner",
      cwd: worktree.worktreePath,
      prompt: buildPlanningPrompt({
        task: state.task,
      }),
      requireHandoff: true,
    });
  }

  private async runImplementationStage(
    state: ActiveRunState,
    retryReason: string | undefined,
  ): Promise<StageSessionResult> {
    const worktree = await this.getImplementerWorktree(state);

    return this.runStageSession(state, {
      role: "implementer",
      cwd: worktree.worktreePath,
      prompt: buildImplementationPrompt({
        task: state.task,
        planningHandoff: state.planningHandoff,
        latestImplementationHandoff: state.implementationHandoff,
        latestReviewHandoff: state.reviewHandoff,
        latestVerificationResult: state.verificationResult,
        retryReason,
      }),
      requireHandoff: true,
    });
  }

  private async runReviewStage(state: ActiveRunState): Promise<StageSessionResult> {
    const worktree = await this.getImplementerWorktree(state);

    return this.runStageSession(state, {
      role: "reviewer",
      cwd: worktree.worktreePath,
      prompt: buildReviewPrompt({
        task: state.task,
        planningHandoff: state.planningHandoff,
        implementationHandoff: state.implementationHandoff,
      }),
      requireHandoff: true,
    });
  }

  private async runVerificationStage(state: ActiveRunState): Promise<VerificationResult> {
    const worktree = await this.getImplementerWorktree(state);
    const profile = this.getVerificationProfile(state.task.verificationProfile);

    await this.recordEvent({
      type: "verification.started",
      timestamp: this.createTimestamp(),
      runId: state.run.runId,
      verificationProfile: profile.name,
      checks: profile.checks.map((check) => check.kind),
    });

    const result = await this.options.verificationRunner.run({
      runId: state.run.runId,
      profile,
      cwd: worktree.worktreePath,
    });

    await this.options.store.verificationResults.save(result);
    await this.recordEvent({
      type: "verification.completed",
      timestamp: this.createTimestamp(),
      result,
    });

    return result;
  }

  private async runStageSession(
    state: ActiveRunState,
    input: {
      readonly role: AgentRole;
      readonly cwd: string;
      readonly prompt: string;
      readonly requireHandoff: boolean;
    },
  ): Promise<StageSessionResult> {
    const adapterKind = state.roleAssignments[input.role];
    const adapter = this.adapters.get(adapterKind);

    if (!adapter) {
      throw new Error(`Missing adapter for kind ${adapterKind}.`);
    }

    const stageTask = {
      ...state.task,
      repoPath: input.cwd,
    } satisfies Task;

    const sessionInput: StartAgentSessionInput = {
      run: state.run,
      task: stageTask,
      adapter: adapterKind,
      role: input.role,
      prompt: input.prompt,
      cwd: input.cwd,
      allowedPaths: state.task.allowedPaths,
      handoff: this.handoffSpec,
    };
    const handle = await adapter.startSession(sessionInput);
    state.activeSessions.set(input.role, handle);

    await this.options.store.sessions.save(handle.session);
    await this.recordEvent({
      type: "agent.session.started",
      timestamp: this.createTimestamp(),
      runId: state.run.runId,
      session: handle.session,
    });

    let latestHandoff: StructuredHandoff | undefined;
    let latestSession = handle.session;
    let stageWork = Promise.resolve();
    let resolveTerminalStatus: ((status: AgentSession["status"]) => void) | undefined;
    let rejectTerminalStatus: ((error: Error) => void) | undefined;
    const terminalStatusPromise = new Promise<AgentSession["status"]>((resolve, reject) => {
      resolveTerminalStatus = resolve;
      rejectTerminalStatus = reject;
    });
    const unsubscribe = await adapter.streamEvents(handle.sessionId, (event) => {
      stageWork = stageWork
        .then(async () => {
          const eventOutcome = await this.handleAgentStreamEvent(state, handle, event);
          latestSession = handle.session;

          if (eventOutcome.handoff) {
            latestHandoff = eventOutcome.handoff;
          }

          if (eventOutcome.terminalStatus) {
            resolveTerminalStatus?.(eventOutcome.terminalStatus);
          }
        })
        .catch((error) => {
          const failure = error instanceof Error ? error : new Error(String(error));
          rejectTerminalStatus?.(failure);
        });
    });
    let terminalStatus: AgentSession["status"] | null = null;

    try {
      terminalStatus = await terminalStatusPromise.finally(unsubscribe);
      await stageWork;
    } finally {
      state.activeSessions.delete(input.role);
    }

    const artifacts = await handle.collectArtifacts();

    for (const artifact of artifacts) {
      await this.options.store.artifacts.save(artifact);
      await this.recordEvent({
        type: "artifact.recorded",
        timestamp: artifact.createdAt,
        runId: state.run.runId,
        artifact,
      });
    }

    if (terminalStatus !== "completed") {
      throw new Error(`${input.role} session ended with status ${terminalStatus}.`);
    }

    if (input.requireHandoff && !latestHandoff) {
      throw new Error(`${input.role} did not produce a structured handoff.`);
    }

    await this.options.store.sessions.save(latestSession);

    return {
      ...(latestHandoff ? { handoff: latestHandoff } : {}),
    };
  }

  private async handleAgentStreamEvent(
    state: ActiveRunState,
    handle: AgentSessionHandle,
    event: AgentStreamEvent,
  ): Promise<{
    readonly handoff?: StructuredHandoff;
    readonly terminalStatus?: AgentSession["status"];
  }> {
    if (isAgentOutputChunk(event)) {
      state.outputChunks.push(event);
      trimLiveOutputChunks(state.outputChunks);
      this.publishRunEvent(event);
      return {};
    }

    if (isAgentSessionStatusEvent(event)) {
      const nextSession = handle.session;
      await this.options.store.sessions.save(nextSession);
      await this.recordEvent({
        type: "agent.session.status.changed",
        timestamp: event.timestamp,
        runId: state.run.runId,
        sessionId: event.sessionId,
        nextStatus: event.status,
        ...(event.previousStatus === undefined ? {} : { previousStatus: event.previousStatus }),
      });

      return TERMINAL_SESSION_STATUSES.has(event.status) ? { terminalStatus: event.status } : {};
    }

    if (isAgentHandoffEvent(event)) {
      await this.recordEvent({
        type: "agent.handoff.received",
        timestamp: event.timestamp,
        runId: state.run.runId,
        handoff: event.handoff,
        session: handle.session,
      });

      return {
        handoff: event.handoff,
      };
    }

    return {};
  }

  private async enforceStagePolicy(
    state: ActiveRunState,
    stage: RuntimePolicyContext["stage"],
  ): Promise<void> {
    if (this.heartbeatEnabled) {
      return;
    }

    const hook = getPolicyHook(this.options.policyHooks, stage);

    if (!hook) {
      return;
    }

    const approvalDraft = await hook({
      run: state.run,
      task: state.task,
      stage,
    });

    if (!approvalDraft) {
      return;
    }

    const approvalRequest: ApprovalRequest = {
      approvalRequestId: this.createApprovalRequestId(),
      runId: state.run.runId,
      kind: approvalDraft.kind,
      title: approvalDraft.title,
      description: approvalDraft.description,
      requestedAt: this.createTimestamp(),
      decision: "pending",
    };

    await this.options.store.approvalRequests.save(approvalRequest);
    await this.recordEvent({
      type: "approval.requested",
      timestamp: approvalRequest.requestedAt,
      runId: state.run.runId,
      approvalRequest,
    });

    state.run = await this.updateRunStatus(state.run, "blocked");

    const decision = await new Promise<ResolveApprovalInput["decision"]>((resolve) => {
      state.approvals.set(approvalRequest.approvalRequestId, {
        runId: state.run.runId,
        resolve,
      });
    });

    state.approvals.delete(approvalRequest.approvalRequestId);

    if (decision === "rejected") {
      throw new Error(`Approval rejected for ${stage}.`);
    }

    state.run = await this.updateRunStatus(state.run, "in_progress");
  }

  private async recordVerdictAndUpdateRun(
    run: Run,
    verdict: Verdict,
    retryStage?: Extract<Run["stage"], "implementing" | "planning">,
  ): Promise<Run> {
    await this.options.store.verdicts.record({
      runId: run.runId,
      verdict,
      recordedAt: this.createTimestamp(),
    });
    await this.recordEvent({
      type: "run.verdict.recorded",
      timestamp: this.createTimestamp(),
      runId: run.runId,
      verdict,
    });

    if (verdict.status === "needs_retry") {
      let nextRun = await this.updateRunStatus(run, "blocked");

      if (retryStage && nextRun.stage !== retryStage) {
        nextRun = await this.setRunStage(nextRun, retryStage);
      }

      return nextRun;
    }

    const completedRun = attachVerdict(run, verdict);
    const persistedRun = await this.persistRun(completedRun);

    if (run.stage !== persistedRun.stage) {
      await this.recordEvent({
        type: "run.stage.changed",
        timestamp: this.createTimestamp(),
        runId: run.runId,
        previousStage: run.stage,
        nextStage: persistedRun.stage,
      });
    }

    if (run.status !== persistedRun.status) {
      await this.recordEvent({
        type: "run.status.changed",
        timestamp: this.createTimestamp(),
        runId: run.runId,
        previousStatus: run.status,
        nextStatus: persistedRun.status,
      });
    }
    return persistedRun;
  }

  private async transitionRunStage(
    run: Run,
    nextStage: Exclude<Run["stage"], "planning">,
  ): Promise<Run> {
    const nextRun = advanceRunStage(run, nextStage);
    await this.options.store.runs.save(nextRun);
    await this.recordEvent({
      type: "run.stage.changed",
      timestamp: this.createTimestamp(),
      runId: run.runId,
      previousStage: run.stage,
      nextStage,
    });

    return nextRun;
  }

  private async setRunStage(run: Run, nextStage: Run["stage"]): Promise<Run> {
    if (run.stage === nextStage) {
      return run;
    }

    const nextRun = {
      ...run,
      stage: nextStage,
    };
    await this.options.store.runs.save(nextRun);
    await this.recordEvent({
      type: "run.stage.changed",
      timestamp: this.createTimestamp(),
      runId: run.runId,
      previousStage: run.stage,
      nextStage,
    });

    return nextRun;
  }

  private async updateRunStatus(run: Run, nextStatus: Run["status"]): Promise<Run> {
    if (run.status === nextStatus) {
      return run;
    }

    const nextRun = {
      ...run,
      status: nextStatus,
    };
    await this.options.store.runs.save(nextRun);
    await this.recordEvent({
      type: "run.status.changed",
      timestamp: this.createTimestamp(),
      runId: run.runId,
      previousStatus: run.status,
      nextStatus,
    });

    return nextRun;
  }

  private async persistRun(run: Run): Promise<Run> {
    await this.options.store.runs.save(run);
    return run;
  }

  private async persistRetriedRun(run: Run): Promise<Run> {
    await this.options.store.runs.save(run);
    await this.recordEvent({
      type: "run.status.changed",
      timestamp: this.createTimestamp(),
      runId: run.runId,
      previousStatus: "blocked",
      nextStatus: run.status,
    });

    return run;
  }

  private async getPlannerWorktree(state: ActiveRunState): Promise<PreparedWorktree> {
    if (!state.worktrees.planner) {
      state.worktrees.planner = await this.options.worktrees.prepare({
        repoPath: state.task.repoPath,
        baseBranch: state.task.baseBranch,
        runId: state.run.runId,
        role: "planner",
      });
    }

    return state.worktrees.planner;
  }

  private async getImplementerWorktree(state: ActiveRunState): Promise<PreparedWorktree> {
    if (!state.worktrees.implementer) {
      state.worktrees.implementer = await this.options.worktrees.prepare({
        repoPath: state.task.repoPath,
        baseBranch: state.task.baseBranch,
        runId: state.run.runId,
        role: "implementer",
      });
    }

    return state.worktrees.implementer;
  }

  private getVerificationProfile(name: string): VerificationProfile {
    return this.verificationProfiles.get(name) ?? createDefaultVerificationProfile();
  }

  private resolveRoleAssignments(
    overrides: StartRunInput["roleAssignments"],
  ): ResolvedRoleAssignments {
    return {
      ...getDefaultRoleAssignments(),
      ...overrides,
    };
  }

  private async recordEvent(event: DomainEvent): Promise<void> {
    await this.options.store.events.record(event);
    this.publishRunEvent(event);
  }

  private publishRunEvent(event: RuntimeRunEvent): void {
    const subscribers = this.runSubscribers.get(getRunIdFromRuntimeEvent(event));

    if (!subscribers) {
      return;
    }

    for (const subscriber of subscribers) {
      subscriber(event);
    }
  }

  private async assertNoActiveRun(): Promise<void> {
    const snapshot = await this.options.store.listRuns();

    if (snapshot.activeRunId !== null) {
      throw new Error(`Run ${snapshot.activeRunId} is already active.`);
    }
  }
}

function createAdapterMap(adapters: readonly AgentAdapter[]): ReadonlyMap<AgentKind, AgentAdapter> {
  return new Map(adapters.map((adapter) => [adapter.kind, adapter]));
}

function createVerificationProfileMap(
  profiles: readonly VerificationProfile[] | undefined,
): Map<string, VerificationProfile> {
  const profileMap = new Map<string, VerificationProfile>();
  const defaultProfile = createDefaultVerificationProfile();

  profileMap.set(defaultProfile.name, defaultProfile);

  for (const profile of profiles ?? []) {
    profileMap.set(profile.name, profile);
  }

  return profileMap;
}

function getLatestHandoffByRole(
  events: RuntimeRunDetails["events"],
  role: AgentRole,
): StructuredHandoff | undefined {
  for (const event of [...events].reverse()) {
    if (event.type === "agent.handoff.received" && event.session.role === role) {
      return event.handoff;
    }
  }

  return undefined;
}

function getPolicyHook(
  policyHooks: CreateOrchestrationRuntimeOptions["policyHooks"],
  stage: RuntimePolicyContext["stage"],
) {
  switch (stage) {
    case "planning":
      return policyHooks?.beforePlanning;
    case "implementing":
      return policyHooks?.beforeImplementing;
    case "reviewing":
      return policyHooks?.beforeReviewing;
    case "verifying":
      return policyHooks?.beforeVerifying;
    case "complete":
      return undefined;
  }
}

function getInitialRunEvents(
  events: RuntimeRunDetails["events"],
  outputChunks: readonly AgentOutputChunk[] | undefined,
): readonly RuntimeRunEvent[] {
  if (!outputChunks || outputChunks.length === 0) {
    return events;
  }

  return [...events, ...outputChunks].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  );
}

function getRunIdFromRuntimeEvent(event: RuntimeRunEvent): RunId {
  if (isAgentOutputChunk(event)) {
    return event.runId;
  }

  switch (event.type) {
    case "run.created":
      return event.run.runId;
    case "verification.completed":
      return event.result.runId;
    default:
      return event.runId;
  }
}

function isAgentSessionStatusEvent(
  event: AgentStreamEvent,
): event is Extract<AgentStreamEvent, { readonly type: "session.status" }> {
  return event.type === "session.status";
}

function isAgentOutputChunk(event: AgentStreamEvent | RuntimeRunEvent): event is AgentOutputChunk {
  return event.type === "stdout" || event.type === "stderr";
}

function trimLiveOutputChunks(outputChunks: AgentOutputChunk[]): void {
  const excessOutputCount = outputChunks.length - MAX_LIVE_OUTPUT_CHUNKS;

  if (excessOutputCount > 0) {
    outputChunks.splice(0, excessOutputCount);
  }
}

function isAgentHandoffEvent(
  event: AgentStreamEvent,
): event is Extract<AgentStreamEvent, { readonly type: "handoff" }> {
  return event.type === "handoff";
}
