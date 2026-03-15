# Log Entry

- Time: 2026-03-15 16:04 CET
- Status assessment: the persisted live-output replay path was implemented, but blocked and resumed runs could re-emit the same output chunks during hydration

## What Was Improved

- Added a duplicate-output guard in the desktop runtime service before replayed chunks are appended or published
- Kept the existing bounded replay history intact while preventing persisted artifact output from being echoed again by the live watcher

## Why It Was Improved

- `subscribeToRun` now hydrates historical output from the replay artifact before attaching the live runtime watcher
- Blocked runs can still have an active in-memory runtime state, so the watcher may replay overlapping chunks that were already loaded from disk
- Without a dedupe guard, the renderer can show duplicated terminal output even though the persistence path is functioning

## Strategic Direction Chosen

- Finish stabilizing the artifact-backed replay model before extending it further
- Prefer a narrow correctness fix in the desktop runtime instead of expanding persistence scope while hydration semantics are still noisy

## Verification

- Passed `node_modules/.bin/tsc --noEmit -p apps/desktop/tsconfig.json`
- Passed `node_modules/.bin/biome check apps/desktop/src/main/runtime-service.ts apps/desktop/src/main/create-runtime-service.ts apps/desktop/src/main/run-output-replay-store.ts`
- `bun run typecheck`, `bun run lint`, and `bun run format` remain unavailable here because `bun` is not installed

## Next Potential Vector

- Persist replay checkpoints incrementally during long-running active sessions so crash recovery does not depend on reaching a blocked or terminal state
