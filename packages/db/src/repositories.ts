import type {
  AgentSession,
  ApprovalRequest,
  Artifact,
  DomainEvent,
  Run,
  Task,
  Verdict,
  VerificationResult,
} from "@iamrobot/protocol";
import { createClient } from "@libsql/client";
import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import {
  getDomainEventRunId,
  type StoredVerdictRecord,
  toAgentSession,
  toAgentSessionRow,
  toApprovalRequest,
  toApprovalRequestRow,
  toArtifact,
  toArtifactRow,
  toDomainEvent,
  toDomainEventRow,
  toRun,
  toRunRow,
  toStoredVerdictRecord,
  toTask,
  toTaskRow,
  toVerdict,
  toVerdictRow,
  toVerificationResult,
  toVerificationResultRow,
} from "./mappers.js";
import {
  agentSessions,
  approvalRequests,
  artifacts,
  domainEvents,
  persistenceSchema,
  runs,
  tasks,
  verdicts,
  verificationResults,
} from "./schema.js";

export type PersistenceDatabase = LibSQLDatabase<typeof persistenceSchema>;

export interface CreatePersistenceDatabaseInput {
  readonly url: string;
  readonly authToken?: string;
}

export function createPersistenceDatabase(
  input: CreatePersistenceDatabaseInput,
): PersistenceDatabase {
  const client = createClient({
    url: input.url,
    ...(input.authToken === undefined ? {} : { authToken: input.authToken }),
  });

  return drizzle(client, {
    schema: persistenceSchema,
  });
}

export interface TaskRepository {
  save(task: Task): Promise<Task>;
  getById(taskId: Task["taskId"]): Promise<Task | null>;
  list(): Promise<readonly Task[]>;
}

export interface RunRepository {
  save(run: Run): Promise<Run>;
  getById(runId: Run["runId"]): Promise<Run | null>;
  list(): Promise<readonly Run[]>;
}

export interface AgentSessionRepository {
  save(session: AgentSession): Promise<AgentSession>;
  listByRunId(runId: Run["runId"]): Promise<readonly AgentSession[]>;
}

export interface ArtifactRepository {
  save(artifact: Artifact): Promise<Artifact>;
  listByRunId(runId: Run["runId"]): Promise<readonly Artifact[]>;
}

export interface VerificationResultRepository {
  save(result: VerificationResult): Promise<VerificationResult>;
  listByRunId(runId: Run["runId"]): Promise<readonly VerificationResult[]>;
  getLatestByRunId(runId: Run["runId"]): Promise<VerificationResult | null>;
}

export interface ApprovalRequestRepository {
  save(request: ApprovalRequest): Promise<ApprovalRequest>;
  getById(approvalRequestId: ApprovalRequest["approvalRequestId"]): Promise<ApprovalRequest | null>;
  listByRunId(runId: Run["runId"]): Promise<readonly ApprovalRequest[]>;
}

export interface VerdictRepository {
  record(input: {
    readonly runId: Run["runId"];
    readonly verdict: Verdict;
    readonly recordedAt: string;
  }): Promise<Verdict>;
  listByRunId(runId: Run["runId"]): Promise<readonly Verdict[]>;
  getLatestByRunId(runId: Run["runId"]): Promise<Verdict | null>;
  getLatestRecordByRunId(runId: Run["runId"]): Promise<StoredVerdictRecord | null>;
}

export interface DomainEventRepository {
  record(event: DomainEvent): Promise<DomainEvent>;
  listByRunId(runId: Run["runId"]): Promise<readonly DomainEvent[]>;
}

export interface PersistenceRepositories {
  readonly tasks: TaskRepository;
  readonly runs: RunRepository;
  readonly sessions: AgentSessionRepository;
  readonly artifacts: ArtifactRepository;
  readonly verificationResults: VerificationResultRepository;
  readonly approvalRequests: ApprovalRequestRepository;
  readonly verdicts: VerdictRepository;
  readonly events: DomainEventRepository;
}

export function createPersistenceRepositories(
  database: PersistenceDatabase,
): PersistenceRepositories {
  return {
    tasks: createTaskRepository(database),
    runs: createRunRepository(database),
    sessions: createAgentSessionRepository(database),
    artifacts: createArtifactRepository(database),
    verificationResults: createVerificationResultRepository(database),
    approvalRequests: createApprovalRequestRepository(database),
    verdicts: createVerdictRepository(database),
    events: createDomainEventRepository(database),
  };
}

function createTaskRepository(database: PersistenceDatabase): TaskRepository {
  return {
    async save(task) {
      const row = toTaskRow(task);

      await database
        .insert(tasks)
        .values(row)
        .onConflictDoUpdate({
          target: tasks.id,
          set: {
            repoPath: row.repoPath,
            baseBranch: row.baseBranch,
            goal: row.goal,
            constraints: row.constraints,
            acceptanceCriteria: row.acceptanceCriteria,
            allowedPaths: row.allowedPaths,
            verificationProfile: row.verificationProfile,
          },
        });

      return task;
    },
    async getById(taskId) {
      const [row] = await database.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      return row ? toTask(row) : null;
    },
    async list() {
      const rows = await database.select().from(tasks).orderBy(asc(tasks.id));
      return rows.map(toTask);
    },
  };
}

function createRunRepository(database: PersistenceDatabase): RunRepository {
  return {
    async save(run) {
      const row = toRunRow(run);

      await database
        .insert(runs)
        .values(row)
        .onConflictDoUpdate({
          target: runs.id,
          set: {
            taskId: row.taskId,
            status: row.status,
            stage: row.stage,
            currentAttempt: row.currentAttempt,
            maxAttempts: row.maxAttempts,
            startedAt: row.startedAt,
            completedAt: row.completedAt,
          },
        });

      return run;
    },
    async getById(runId) {
      const [row] = await database.select().from(runs).where(eq(runs.id, runId)).limit(1);
      return row ? toRun(row) : null;
    },
    async list() {
      const rows = await database.select().from(runs).orderBy(desc(runs.startedAt), desc(runs.id));
      return rows.map(toRun);
    },
  };
}

function createAgentSessionRepository(database: PersistenceDatabase): AgentSessionRepository {
  return {
    async save(session) {
      const row = toAgentSessionRow(session);

      await database
        .insert(agentSessions)
        .values(row)
        .onConflictDoUpdate({
          target: agentSessions.id,
          set: {
            runId: row.runId,
            adapter: row.adapter,
            role: row.role,
            status: row.status,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
          },
        });

      return session;
    },
    async listByRunId(runId) {
      const rows = await database
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.runId, runId))
        .orderBy(asc(agentSessions.startedAt), asc(agentSessions.id));

      return rows.map(toAgentSession);
    },
  };
}

function createArtifactRepository(database: PersistenceDatabase): ArtifactRepository {
  return {
    async save(artifact) {
      const row = toArtifactRow(artifact);

      await database
        .insert(artifacts)
        .values(row)
        .onConflictDoUpdate({
          target: artifacts.id,
          set: {
            runId: row.runId,
            sessionId: row.sessionId,
            kind: row.kind,
            label: row.label,
            path: row.path,
            contentType: row.contentType,
            createdAt: row.createdAt,
          },
        });

      return artifact;
    },
    async listByRunId(runId) {
      const rows = await database
        .select()
        .from(artifacts)
        .where(eq(artifacts.runId, runId))
        .orderBy(asc(artifacts.createdAt), asc(artifacts.id));

      return rows.map(toArtifact);
    },
  };
}

function createVerificationResultRepository(
  database: PersistenceDatabase,
): VerificationResultRepository {
  return {
    async save(result) {
      const row = toVerificationResultRow(result);

      await database
        .insert(verificationResults)
        .values(row)
        .onConflictDoUpdate({
          target: verificationResults.id,
          set: {
            runId: row.runId,
            status: row.status,
            checks: row.checks,
            completedAt: row.completedAt,
          },
        });

      return result;
    },
    async listByRunId(runId) {
      const rows = await database
        .select()
        .from(verificationResults)
        .where(eq(verificationResults.runId, runId))
        .orderBy(desc(verificationResults.completedAt), desc(verificationResults.id));

      return rows.map(toVerificationResult);
    },
    async getLatestByRunId(runId) {
      const [row] = await database
        .select()
        .from(verificationResults)
        .where(eq(verificationResults.runId, runId))
        .orderBy(desc(verificationResults.completedAt), desc(verificationResults.id))
        .limit(1);

      return row ? toVerificationResult(row) : null;
    },
  };
}

function createApprovalRequestRepository(database: PersistenceDatabase): ApprovalRequestRepository {
  return {
    async save(request) {
      const row = toApprovalRequestRow(request);

      await database
        .insert(approvalRequests)
        .values(row)
        .onConflictDoUpdate({
          target: approvalRequests.id,
          set: {
            runId: row.runId,
            kind: row.kind,
            title: row.title,
            description: row.description,
            requestedAt: row.requestedAt,
            resolvedAt: row.resolvedAt,
            decision: row.decision,
          },
        });

      return request;
    },
    async getById(approvalRequestId) {
      const [row] = await database
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.id, approvalRequestId))
        .limit(1);

      return row ? toApprovalRequest(row) : null;
    },
    async listByRunId(runId) {
      const rows = await database
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.runId, runId))
        .orderBy(desc(approvalRequests.requestedAt), desc(approvalRequests.id));

      return rows.map(toApprovalRequest);
    },
  };
}

function createVerdictRepository(database: PersistenceDatabase): VerdictRepository {
  const getLatestRecordByRunId = async (
    runId: Run["runId"],
  ): Promise<StoredVerdictRecord | null> => {
    const [row] = await database
      .select()
      .from(verdicts)
      .where(eq(verdicts.runId, runId))
      .orderBy(desc(verdicts.recordedAt), desc(verdicts.id))
      .limit(1);

    return row ? toStoredVerdictRecord(row) : null;
  };

  return {
    async record(input) {
      await database.insert(verdicts).values(toVerdictRow(input));
      return input.verdict;
    },
    async listByRunId(runId) {
      const rows = await database
        .select()
        .from(verdicts)
        .where(eq(verdicts.runId, runId))
        .orderBy(desc(verdicts.recordedAt), desc(verdicts.id));

      return rows.map(toVerdict);
    },
    async getLatestByRunId(runId) {
      const record = await getLatestRecordByRunId(runId);
      return record?.verdict ?? null;
    },
    getLatestRecordByRunId,
  };
}

function createDomainEventRepository(database: PersistenceDatabase): DomainEventRepository {
  return {
    async record(event) {
      await database.insert(domainEvents).values(toDomainEventRow(event));
      return event;
    },
    async listByRunId(runId) {
      const rows = await database
        .select()
        .from(domainEvents)
        .where(eq(domainEvents.runId, runId))
        .orderBy(asc(domainEvents.timestamp), asc(domainEvents.id));

      return rows.map(toDomainEvent);
    },
  };
}

export async function getPersistedEventForRun(
  database: PersistenceDatabase,
  event: DomainEvent,
): Promise<DomainEvent | null> {
  const runId = getDomainEventRunId(event);
  const [row] = await database
    .select()
    .from(domainEvents)
    .where(and(eq(domainEvents.runId, runId), eq(domainEvents.timestamp, event.timestamp)))
    .orderBy(desc(domainEvents.id))
    .limit(1);

  return row ? toDomainEvent(row) : null;
}
