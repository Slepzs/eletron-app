import type {
  RunId,
  VerificationCheckKind,
  VerificationCheckResult,
  VerificationResult,
  VerificationResultId,
} from "@iamrobot/protocol";

export interface VerificationCommand {
  readonly kind: VerificationCheckKind;
  readonly command: string;
  readonly required: boolean;
}

export interface VerificationProfile {
  readonly name: string;
  readonly checks: readonly VerificationCommand[];
}

export interface RunVerificationInput {
  readonly runId: RunId;
  readonly profile: VerificationProfile;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly signal?: AbortSignal;
}

export interface ExecuteVerificationCommandInput {
  readonly command: VerificationCommand;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly signal?: AbortSignal;
}

export interface VerificationCommandExecutionResult {
  readonly command: string;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly error?: Error;
}

export interface CreateVerificationResultInput {
  readonly runId: RunId;
  readonly checks: readonly VerificationCheckResult[];
  readonly verificationResultId: VerificationResultId;
  readonly completedAt: VerificationResult["completedAt"];
}

export type VerificationCommandExecutor = (
  input: ExecuteVerificationCommandInput,
) => Promise<VerificationCommandExecutionResult>;

export interface VerificationRunner {
  run(input: RunVerificationInput): Promise<VerificationResult>;
}
