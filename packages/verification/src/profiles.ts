import type { VerificationCheckKind } from "@iamrobot/protocol";

import type { VerificationCommand, VerificationProfile } from "./types.js";

export const DEFAULT_VERIFICATION_PROFILE_NAME = "default";

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

export function createVerificationCommand(command: VerificationCommand): VerificationCommand {
  return { ...command };
}

export function createVerificationProfile(
  name: string,
  checks: readonly VerificationCommand[],
): VerificationProfile {
  return {
    name,
    checks: checks.map(createVerificationCommand),
  };
}

export function createDefaultVerificationProfile(): VerificationProfile {
  return createVerificationProfile(DEFAULT_VERIFICATION_PROFILE_NAME, defaultVerificationCommands);
}

export function getVerificationCommand(
  profile: VerificationProfile,
  kind: VerificationCheckKind,
): VerificationCommand | undefined {
  return profile.checks.find((check) => check.kind === kind);
}

export function getRequiredVerificationCommands(
  profile: VerificationProfile,
): readonly VerificationCommand[] {
  return profile.checks.filter((check) => check.required);
}

export function getOptionalVerificationCommands(
  profile: VerificationProfile,
): readonly VerificationCommand[] {
  return profile.checks.filter((check) => !check.required);
}
