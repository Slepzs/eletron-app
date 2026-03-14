import type {
  RunId,
  RuntimeRunDetails,
  RuntimeRunSummary,
  RuntimeSnapshot,
  Verdict,
  VerificationResult,
} from "@iamrobot/protocol";

import {
  createPersistenceRepositories,
  type PersistenceDatabase,
  type PersistenceRepositories,
} from "./repositories.js";

export interface PersistenceStore extends PersistenceRepositories {
  listRuns(): Promise<RuntimeSnapshot>;
  getRunDetails(runId: RunId): Promise<RuntimeRunDetails | null>;
}

export function createPersistenceStore(database: PersistenceDatabase): PersistenceStore {
  const repositories = createPersistenceRepositories(database);

  return {
    ...repositories,
    async listRuns() {
      const runs = await repositories.runs.list();

      const summaries = await Promise.all(
        runs.map(async (run) => {
          const [task, latestVerificationResult, latestVerdict] = await Promise.all([
            repositories.tasks.getById(run.taskId),
            repositories.verificationResults.getLatestByRunId(run.runId),
            repositories.verdicts.getLatestByRunId(run.runId),
          ]);

          return buildRunSummary({
            task: requireEntity(task, `Missing task ${run.taskId} for run ${run.runId}.`),
            run,
            latestVerificationResult,
            latestVerdict,
          });
        }),
      );

      return {
        runs: summaries,
        activeRunId: runs.find((run) => run.completedAt === undefined)?.runId ?? null,
      };
    },
    async getRunDetails(runId) {
      const run = await repositories.runs.getById(runId);

      if (!run) {
        return null;
      }

      const [
        task,
        sessions,
        artifacts,
        approvalRequests,
        events,
        latestVerificationResult,
        latestVerdict,
      ] = await Promise.all([
        repositories.tasks.getById(run.taskId),
        repositories.sessions.listByRunId(run.runId),
        repositories.artifacts.listByRunId(run.runId),
        repositories.approvalRequests.listByRunId(run.runId),
        repositories.events.listByRunId(run.runId),
        repositories.verificationResults.getLatestByRunId(run.runId),
        repositories.verdicts.getLatestByRunId(run.runId),
      ]);

      return buildRunDetails({
        task: requireEntity(task, `Missing task ${run.taskId} for run ${run.runId}.`),
        run,
        sessions,
        artifacts,
        approvalRequests,
        events,
        latestVerificationResult,
        latestVerdict,
      });
    },
  };
}

function requireEntity<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }

  return value;
}

function buildRunSummary(input: {
  readonly task: RuntimeRunSummary["task"];
  readonly run: RuntimeRunSummary["run"];
  readonly latestVerificationResult: VerificationResult | null;
  readonly latestVerdict: Verdict | null;
}): RuntimeRunSummary {
  return {
    task: input.task,
    run: input.run,
    ...(input.latestVerificationResult === null
      ? {}
      : { latestVerificationResult: input.latestVerificationResult }),
    ...(input.latestVerdict === null ? {} : { latestVerdict: input.latestVerdict }),
  };
}

function buildRunDetails(input: {
  readonly task: RuntimeRunDetails["task"];
  readonly run: RuntimeRunDetails["run"];
  readonly sessions: RuntimeRunDetails["sessions"];
  readonly artifacts: RuntimeRunDetails["artifacts"];
  readonly approvalRequests: RuntimeRunDetails["approvalRequests"];
  readonly events: RuntimeRunDetails["events"];
  readonly latestVerificationResult: VerificationResult | null;
  readonly latestVerdict: Verdict | null;
}): RuntimeRunDetails {
  return {
    task: input.task,
    run: input.run,
    sessions: input.sessions,
    artifacts: input.artifacts,
    approvalRequests: input.approvalRequests,
    events: input.events,
    ...(input.latestVerificationResult === null
      ? {}
      : { latestVerificationResult: input.latestVerificationResult }),
    ...(input.latestVerdict === null ? {} : { latestVerdict: input.latestVerdict }),
  };
}
