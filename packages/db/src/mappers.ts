import type {
  AgentSession,
  ApprovalRequest,
  Artifact,
  DomainEvent,
  Project,
  Run,
  Task,
  Verdict,
  VerificationResult,
} from "@iamrobot/protocol";

import type {
  AgentSessionInsert,
  AgentSessionRow,
  AppPreferenceInsert,
  AppPreferenceRow,
  ApprovalRequestInsert,
  ApprovalRequestRow,
  ArtifactInsert,
  ArtifactRow,
  DomainEventInsert,
  DomainEventRow,
  ProjectInsert,
  ProjectRow,
  RunInsert,
  RunRow,
  TaskInsert,
  TaskRow,
  VerdictInsert,
  VerdictRow,
  VerificationResultInsert,
  VerificationResultRow,
} from "./schema.js";

export function toProjectRow(project: Project): ProjectInsert {
  return {
    id: project.projectId,
    name: project.name,
    repoPath: project.repoPath,
    defaultBaseBranch: project.defaultBaseBranch,
    defaultAllowedPaths: project.defaultAllowedPaths,
    verificationProfile: project.verificationProfile,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function toProject(row: ProjectRow): Project {
  return {
    projectId: row.id,
    name: row.name,
    repoPath: row.repoPath,
    defaultBaseBranch: row.defaultBaseBranch,
    defaultAllowedPaths: row.defaultAllowedPaths,
    verificationProfile: row.verificationProfile,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toTaskRow(task: Task): TaskInsert {
  return {
    id: task.taskId,
    repoPath: task.repoPath,
    baseBranch: task.baseBranch,
    goal: task.goal,
    constraints: task.constraints,
    acceptanceCriteria: task.acceptanceCriteria,
    allowedPaths: task.allowedPaths,
    verificationProfile: task.verificationProfile,
  };
}

export function toTask(row: TaskRow): Task {
  return {
    taskId: row.id,
    repoPath: row.repoPath,
    baseBranch: row.baseBranch,
    goal: row.goal,
    constraints: row.constraints,
    acceptanceCriteria: row.acceptanceCriteria,
    allowedPaths: row.allowedPaths,
    verificationProfile: row.verificationProfile,
  };
}

export function toRunRow(run: Run): RunInsert {
  return {
    id: run.runId,
    taskId: run.taskId,
    status: run.status,
    stage: run.stage,
    currentAttempt: run.currentAttempt,
    maxAttempts: run.maxAttempts,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? null,
  };
}

export function toRun(row: RunRow): Run {
  return {
    runId: row.id,
    taskId: row.taskId,
    status: row.status,
    stage: row.stage,
    currentAttempt: row.currentAttempt,
    maxAttempts: row.maxAttempts,
    startedAt: row.startedAt,
    ...(row.completedAt === null ? {} : { completedAt: row.completedAt }),
  };
}

export function toAgentSessionRow(session: AgentSession): AgentSessionInsert {
  return {
    id: session.sessionId,
    runId: session.runId,
    adapter: session.adapter,
    role: session.role,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
  };
}

export function toAgentSession(row: AgentSessionRow): AgentSession {
  return {
    sessionId: row.id,
    runId: row.runId,
    adapter: row.adapter,
    role: row.role,
    status: row.status,
    startedAt: row.startedAt,
    ...(row.endedAt === null ? {} : { endedAt: row.endedAt }),
  };
}

export function toArtifactRow(artifact: Artifact): ArtifactInsert {
  return {
    id: artifact.artifactId,
    runId: artifact.runId,
    sessionId: artifact.sessionId ?? null,
    kind: artifact.kind,
    label: artifact.label,
    path: artifact.path ?? null,
    contentType: artifact.contentType ?? null,
    createdAt: artifact.createdAt,
  };
}

export function toArtifact(row: ArtifactRow): Artifact {
  return {
    artifactId: row.id,
    runId: row.runId,
    kind: row.kind,
    label: row.label,
    createdAt: row.createdAt,
    ...(row.sessionId === null ? {} : { sessionId: row.sessionId }),
    ...(row.path === null ? {} : { path: row.path }),
    ...(row.contentType === null ? {} : { contentType: row.contentType }),
  };
}

export function toVerificationResultRow(result: VerificationResult): VerificationResultInsert {
  return {
    id: result.verificationResultId,
    runId: result.runId,
    status: result.status,
    checks: result.checks,
    completedAt: result.completedAt,
  };
}

export function toVerificationResult(row: VerificationResultRow): VerificationResult {
  return {
    verificationResultId: row.id,
    runId: row.runId,
    status: row.status,
    checks: row.checks,
    completedAt: row.completedAt,
  };
}

export function toApprovalRequestRow(request: ApprovalRequest): ApprovalRequestInsert {
  return {
    id: request.approvalRequestId,
    runId: request.runId,
    kind: request.kind,
    title: request.title,
    description: request.description,
    requestedAt: request.requestedAt,
    resolvedAt: request.resolvedAt ?? null,
    decision: request.decision,
  };
}

export function toApprovalRequest(row: ApprovalRequestRow): ApprovalRequest {
  return {
    approvalRequestId: row.id,
    runId: row.runId,
    kind: row.kind,
    title: row.title,
    description: row.description,
    requestedAt: row.requestedAt,
    decision: row.decision,
    ...(row.resolvedAt === null ? {} : { resolvedAt: row.resolvedAt }),
  };
}

export interface VerdictRecord {
  readonly runId: Run["runId"];
  readonly verdict: Verdict;
  readonly recordedAt: string;
}

export function toVerdictRow(record: VerdictRecord): VerdictInsert {
  return {
    runId: record.runId,
    status: record.verdict.status,
    summary: record.verdict.summary,
    blockingIssues: record.verdict.blockingIssues,
    proposedNextAction: record.verdict.proposedNextAction,
    confidence: record.verdict.confidence,
    recordedAt: record.recordedAt,
    errorContext: record.verdict.failureContext ?? null,
  };
}

export function toVerdict(row: VerdictRow): Verdict {
  return {
    status: row.status,
    summary: row.summary,
    blockingIssues: row.blockingIssues,
    proposedNextAction: row.proposedNextAction,
    confidence: row.confidence,
    ...(row.errorContext != null ? { failureContext: row.errorContext } : {}),
  };
}

export interface StoredVerdictRecord extends VerdictRecord {
  readonly id: number;
}

export function toStoredVerdictRecord(row: VerdictRow): StoredVerdictRecord {
  return {
    id: row.id,
    runId: row.runId,
    verdict: toVerdict(row),
    recordedAt: row.recordedAt,
  };
}

export function getDomainEventRunId(event: DomainEvent): Run["runId"] {
  switch (event.type) {
    case "run.created":
      return event.run.runId;
    case "verification.completed":
      return event.result.runId;
    default:
      return event.runId;
  }
}

export function toDomainEventRow(event: DomainEvent): DomainEventInsert {
  return {
    runId: getDomainEventRunId(event),
    type: event.type,
    timestamp: event.timestamp,
    payload: event,
  };
}

export function toDomainEvent(row: DomainEventRow): DomainEvent {
  return row.payload;
}

export interface AppPreferenceRecord {
  readonly key: string;
  readonly value: string | null;
}

export function toAppPreferenceRow(record: AppPreferenceRecord): AppPreferenceInsert {
  return {
    key: record.key,
    value: record.value,
  };
}

export function toAppPreference(row: AppPreferenceRow): AppPreferenceRecord {
  return {
    key: row.key,
    value: row.value,
  };
}
