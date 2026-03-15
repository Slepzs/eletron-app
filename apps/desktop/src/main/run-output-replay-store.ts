import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PersistenceStore } from "@iamrobot/db";
import {
  type AgentOutputChunk,
  type Artifact,
  createEntityId,
  createTimestamp,
  MAX_LIVE_OUTPUT_CHUNKS,
  type RunId,
  type RuntimeRunDetails,
} from "@iamrobot/protocol";

const RUN_OUTPUT_REPLAY_LABEL = "Run live output replay";
const RUN_OUTPUT_REPLAY_CONTENT_TYPE = "application/x-iamrobot-live-output+jsonl";
const RUN_OUTPUT_REPLAY_FILE_NAME = "live-output.jsonl";

export interface RunOutputReplayStore {
  load(details: RuntimeRunDetails): Promise<readonly AgentOutputChunk[]>;
  save(runId: RunId, outputChunks: readonly AgentOutputChunk[]): Promise<boolean>;
}

interface CreateRunOutputReplayStoreInput {
  readonly artifactsRoot: string;
  readonly store: PersistenceStore;
}

export function createRunOutputReplayStore(
  input: CreateRunOutputReplayStoreInput,
): RunOutputReplayStore {
  return new FileBackedRunOutputReplayStore(input);
}

class FileBackedRunOutputReplayStore implements RunOutputReplayStore {
  constructor(private readonly input: CreateRunOutputReplayStoreInput) {}

  async load(details: RuntimeRunDetails): Promise<readonly AgentOutputChunk[]> {
    const artifact = getReplayArtifact(details.artifacts);

    if (artifact?.path === undefined) {
      return [];
    }

    try {
      const rawContent = await readFile(artifact.path, "utf8");

      return trimReplayChunks(
        rawContent
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .flatMap((line) => {
            try {
              const parsed = JSON.parse(line) as unknown;
              return isAgentOutputChunk(parsed) ? [parsed] : [];
            } catch {
              return [];
            }
          }),
      );
    } catch {
      return [];
    }
  }

  async save(runId: RunId, outputChunks: readonly AgentOutputChunk[]): Promise<boolean> {
    const replayChunks = trimReplayChunks(outputChunks);

    if (replayChunks.length === 0) {
      return false;
    }

    const artifacts = await this.input.store.artifacts.listByRunId(runId);
    const existingArtifact = getReplayArtifact(artifacts);
    const artifactPath =
      existingArtifact?.path ??
      path.join(this.input.artifactsRoot, runId, "replay", RUN_OUTPUT_REPLAY_FILE_NAME);

    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(
      artifactPath,
      `${replayChunks.map((chunk) => JSON.stringify(chunk)).join("\n")}\n`,
      "utf8",
    );

    const artifact: Artifact = {
      artifactId: existingArtifact?.artifactId ?? createEntityId("artifact", randomUUID()),
      runId,
      kind: "log",
      label: RUN_OUTPUT_REPLAY_LABEL,
      path: artifactPath,
      contentType: RUN_OUTPUT_REPLAY_CONTENT_TYPE,
      createdAt: replayChunks[replayChunks.length - 1]?.timestamp ?? createTimestamp(),
    };

    await this.input.store.artifacts.save(artifact);

    return true;
  }
}

function getReplayArtifact(artifacts: readonly Artifact[]): Artifact | undefined {
  return [...artifacts]
    .reverse()
    .find(
      (artifact) =>
        artifact.kind === "log" &&
        artifact.label === RUN_OUTPUT_REPLAY_LABEL &&
        artifact.contentType === RUN_OUTPUT_REPLAY_CONTENT_TYPE,
    );
}

function trimReplayChunks(outputChunks: readonly AgentOutputChunk[]): readonly AgentOutputChunk[] {
  if (outputChunks.length <= MAX_LIVE_OUTPUT_CHUNKS) {
    return outputChunks;
  }

  return outputChunks.slice(outputChunks.length - MAX_LIVE_OUTPUT_CHUNKS);
}

function isAgentOutputChunk(value: unknown): value is AgentOutputChunk {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AgentOutputChunk>;

  return (
    (candidate.type === "stdout" || candidate.type === "stderr") &&
    typeof candidate.runId === "string" &&
    typeof candidate.sessionId === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.timestamp === "string"
  );
}
