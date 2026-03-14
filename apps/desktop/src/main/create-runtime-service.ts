import path from "node:path";

import { ClaudeCodeAdapter } from "@iamrobot/agent-claude";
import { CodexCliAdapter } from "@iamrobot/agent-codex";
import { prepareIsolatedWorktree } from "@iamrobot/git";
import { createOrchestrationRuntime } from "@iamrobot/orchestration";
import { createDefaultVerificationProfile, createVerificationRunner } from "@iamrobot/verification";

import { createDesktopPersistenceStore } from "./persistence.js";
import { DefaultDesktopRuntimeService, type DesktopRuntimeService } from "./runtime-service.js";

export interface CreateDesktopRuntimeServiceInput {
  readonly userDataPath: string;
}

export async function createDesktopRuntimeService(
  input: CreateDesktopRuntimeServiceInput,
): Promise<DesktopRuntimeService> {
  const store = await createDesktopPersistenceStore(input.userDataPath);
  const artifactsRoot = path.join(input.userDataPath, "artifacts");

  const runtime = createOrchestrationRuntime({
    adapters: [
      new ClaudeCodeAdapter(),
      new CodexCliAdapter({
        artifactsRoot,
      }),
    ],
    store,
    verificationRunner: createVerificationRunner(),
    verificationProfiles: [createDefaultVerificationProfile()],
    worktrees: {
      prepare: prepareIsolatedWorktree,
    },
  });

  return new DefaultDesktopRuntimeService(runtime);
}
