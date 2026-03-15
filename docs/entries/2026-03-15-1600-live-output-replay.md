# Log Entry

- Time: 2026-03-15 16:00 CET
- Status assessment: the bounded live-output work was stable, but historical replay still disappeared after process restarts and blocked runs

## What Was Improved

- Added a desktop-main `run-output-replay-store` that persists the bounded live-output buffer as a JSONL log artifact per run
- Hydrated `subscribeToRun` from the persisted replay artifact so historical output is available again after restarting the app
- Checkpointed replay artifacts whenever a run moves to `blocked`, `failed`, or `succeeded`
- Re-published snapshots after replay persistence so refreshed run details can see the new artifact metadata

## Why It Was Improved

- The previous retention cap solved memory growth, but it also meant live output only existed in memory for the current process lifetime
- Autonomous and retry-heavy workflows need recent terminal context to survive restarts and blocked states
- Persisting the bounded replay buffer preserves useful debugging context without reintroducing unbounded in-memory history

## Strategic Direction Chosen

- Extend the existing artifact-backed runtime model instead of inventing a second persistence path
- Keep replay durability local-first and bounded so autonomous operation stays resilient without compromising memory limits

## Verification

- Passed `apps/desktop/node_modules/.bin/tsc --noEmit -p apps/desktop/tsconfig.json`
- Passed `node_modules/.bin/biome check apps/desktop/src/main/create-runtime-service.ts apps/desktop/src/main/runtime-service.ts apps/desktop/src/main/run-output-replay-store.ts`
- `bun run typecheck`, `bun run lint`, and `bun run format` remain unavailable here because the required package-manager binary is missing

## Next Potential Vector

- Persist replay incrementally during long-running active sessions so crash or force-quit recovery does not depend on reaching a blocked or terminal status
