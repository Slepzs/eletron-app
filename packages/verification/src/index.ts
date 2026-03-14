import type {
  VerificationCheckKind,
  VerificationCheckResult,
  VerificationResult,
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

export interface VerificationRunner {
  run(profile: VerificationProfile): Promise<VerificationResult>;
}

export const defaultVerificationCommands = [
  {
    kind: "typecheck",
    command: "bun run typecheck",
    required: true,
  },
  {
    kind: "lint",
    command: "bun run lint",
    required: true,
  },
  {
    kind: "tests",
    command: "bun run test",
    required: false,
  },
] as const satisfies readonly VerificationCommand[];

export function createDefaultVerificationProfile(): VerificationProfile {
  return {
    name: "default",
    checks: defaultVerificationCommands,
  };
}

export function didVerificationPass(
  checks: readonly VerificationCheckResult[],
): checks is readonly VerificationCheckResult[] {
  return checks.every((check) => check.status !== "failed");
}
