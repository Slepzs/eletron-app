import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

import type { VerificationCheckResult, VerificationResultId } from "@iamrobot/protocol";
import { createEntityId, createTimestamp } from "@iamrobot/protocol";

import {
  createSkippedVerificationCheckResult,
  createVerificationResult,
  normalizeVerificationCheckResult,
} from "./normalization";
import type {
  ExecuteVerificationCommandInput,
  RunVerificationInput,
  VerificationCommandExecutionResult,
  VerificationCommandExecutor,
  VerificationRunner,
} from "./types";

export interface CreateVerificationRunnerOptions {
  readonly executeCommand?: VerificationCommandExecutor;
  readonly createCompletedAt?: () => string;
  readonly createVerificationResultId?: () => VerificationResultId;
}

export function createVerificationResultIdFactory(): () => VerificationResultId {
  return () => createEntityId("verification-result", randomUUID());
}

export function createVerificationRunner(
  options: CreateVerificationRunnerOptions = {},
): VerificationRunner {
  return new ProcessVerificationRunner(options);
}

export async function executeVerificationCommand(
  input: ExecuteVerificationCommandInput,
): Promise<VerificationCommandExecutionResult> {
  const startedAt = Date.now();

  return new Promise<VerificationCommandExecutionResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const child = spawn(input.command.command, {
      cwd: input.cwd,
      env: {
        ...process.env,
        ...input.env,
      },
      shell: true,
      signal: input.signal,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;

      resolve({
        command: input.command.command,
        exitCode: null,
        signal: null,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    });

    child.on("close", (exitCode, signal) => {
      if (settled) {
        return;
      }

      settled = true;

      resolve({
        command: input.command.command,
        exitCode,
        signal,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

class ProcessVerificationRunner implements VerificationRunner {
  private readonly executeCommand: VerificationCommandExecutor;
  private readonly createCompletedAt: () => string;
  private readonly createVerificationResultId: () => VerificationResultId;

  constructor(options: CreateVerificationRunnerOptions) {
    this.executeCommand = options.executeCommand ?? executeVerificationCommand;
    this.createCompletedAt = options.createCompletedAt ?? (() => createTimestamp());
    this.createVerificationResultId =
      options.createVerificationResultId ?? createVerificationResultIdFactory();
  }

  async run(input: RunVerificationInput) {
    const checks: VerificationCheckResult[] = [];

    for (const command of input.profile.checks) {
      if (input.signal?.aborted) {
        checks.push(
          createSkippedVerificationCheckResult(
            command,
            "Skipped because verification was aborted before execution.",
          ),
        );

        continue;
      }

      const executionInput: ExecuteVerificationCommandInput = {
        command,
        ...(input.cwd ? { cwd: input.cwd } : {}),
        ...(input.env ? { env: input.env } : {}),
        ...(input.signal ? { signal: input.signal } : {}),
      };

      const execution = await this.executeCommand(executionInput);

      checks.push(normalizeVerificationCheckResult(command, execution));
    }

    return createVerificationResult({
      runId: input.runId,
      checks,
      verificationResultId: this.createVerificationResultId(),
      completedAt: this.createCompletedAt(),
    });
  }
}
