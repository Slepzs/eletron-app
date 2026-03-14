import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AgentOutputChannel, AgentSession, Artifact, ArtifactId } from "@iamrobot/protocol";

interface CreateCodexArtifactStoreInput {
  readonly artifactsRoot: string | undefined;
  readonly createArtifactId: () => ArtifactId;
  readonly createTimestamp: () => string;
  readonly runId: AgentSession["runId"];
  readonly sessionId: AgentSession["sessionId"];
}

export class CodexArtifactStore {
  private readonly createArtifactId: () => ArtifactId;
  private readonly createTimestamp: () => string;
  private readonly runId: AgentSession["runId"];
  private readonly sessionId: AgentSession["sessionId"];
  private readonly rootDir: string;
  private readonly handoffArtifacts: Artifact[] = [];
  private initialized?: Promise<void>;
  private pendingWrite = Promise.resolve();
  private rawEventArtifact?: Artifact;
  private stderrArtifact?: Artifact;
  private stdoutArtifact?: Artifact;

  constructor(input: CreateCodexArtifactStoreInput) {
    this.createArtifactId = input.createArtifactId;
    this.createTimestamp = input.createTimestamp;
    this.runId = input.runId;
    this.sessionId = input.sessionId;
    this.rootDir =
      input.artifactsRoot ?? join(tmpdir(), "iamrobot", "agent-codex", input.sessionId);
  }

  recordRawEvent(rawLine: string): void {
    const artifact = this.ensureLogArtifact(
      "events.jsonl",
      "Codex raw event log",
      "application/jsonl",
      "raw",
    );
    const artifactPath = getRequiredArtifactPath(artifact);

    this.queueWrite(() => appendFile(artifactPath, `${rawLine}\n`, "utf8"));
  }

  recordStreamChunk(channel: AgentOutputChannel, content: string): void {
    if (content.length === 0) {
      return;
    }

    const artifact =
      channel === "stdout"
        ? this.ensureLogArtifact("stdout.log", "Codex stdout log", "text/plain", "stdout")
        : this.ensureLogArtifact("stderr.log", "Codex stderr log", "text/plain", "stderr");
    const artifactPath = getRequiredArtifactPath(artifact);

    this.queueWrite(() => appendFile(artifactPath, content, "utf8"));
  }

  recordHandoff(rawText: string): void {
    const artifactNumber = this.handoffArtifacts.length + 1;
    const artifactPath = join(this.rootDir, `handoff-${artifactNumber}.md`);
    const artifact: Artifact = {
      artifactId: this.createArtifactId(),
      runId: this.runId,
      sessionId: this.sessionId,
      kind: "handoff",
      label: `Codex handoff ${artifactNumber}`,
      path: artifactPath,
      contentType: "text/markdown",
      createdAt: this.createTimestamp(),
    };

    this.handoffArtifacts.push(artifact);
    this.queueWrite(() => writeFile(artifactPath, rawText, "utf8"));
  }

  async collectArtifacts(): Promise<readonly Artifact[]> {
    await this.flush();

    return [
      this.rawEventArtifact,
      this.stdoutArtifact,
      this.stderrArtifact,
      ...this.handoffArtifacts,
    ].filter((artifact): artifact is Artifact => artifact !== undefined);
  }

  async flush(): Promise<void> {
    await this.pendingWrite;
  }

  private ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.initialized = mkdir(this.rootDir, { recursive: true }).then(() => {});
    }

    return this.initialized;
  }

  private ensureLogArtifact(
    fileName: string,
    label: string,
    contentType: string,
    key: "raw" | "stderr" | "stdout",
  ): Artifact {
    const existingArtifact =
      key === "raw"
        ? this.rawEventArtifact
        : key === "stdout"
          ? this.stdoutArtifact
          : this.stderrArtifact;

    if (existingArtifact) {
      return existingArtifact;
    }

    const artifact: Artifact = {
      artifactId: this.createArtifactId(),
      runId: this.runId,
      sessionId: this.sessionId,
      kind: "log",
      label,
      path: join(this.rootDir, fileName),
      contentType,
      createdAt: this.createTimestamp(),
    };

    if (key === "raw") {
      this.rawEventArtifact = artifact;
    } else if (key === "stdout") {
      this.stdoutArtifact = artifact;
    } else {
      this.stderrArtifact = artifact;
    }

    return artifact;
  }

  private queueWrite(operation: () => Promise<void>): void {
    const nextWrite = this.pendingWrite.then(async () => {
      await this.ensureInitialized();
      await operation();
    });

    this.pendingWrite = nextWrite.catch(() => {});
  }
}

function getRequiredArtifactPath(artifact: Artifact): string {
  if (!artifact.path) {
    throw new Error(`Artifact ${artifact.artifactId} is missing a file path.`);
  }

  return artifact.path;
}
