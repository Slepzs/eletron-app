# Log Entry

- Time: 2026-03-15 16:08 CET
- Status assessment: incremental live-output checkpointing was in progress, but resumed runs were treating restored replay history as new output and could checkpoint again immediately

## What Was Improved

- Seeded the desktop replay checkpoint cursor from already-loaded run history during `subscribeToRun`
- Centralized live-output counting in a small helper so the checkpoint path uses one source of truth

## Why It Was Improved

- The new active-session checkpointing path should persist after meaningful new output, not just because an old replay artifact was rehydrated
- Without initializing the cursor from the loaded replay buffer, a resumed or restarted run could write a fresh checkpoint on the very next output chunk even when no interval had really elapsed

## Strategic Direction Chosen

- Finish the incremental checkpointing vector by tightening write semantics before leaving the runtime path
- Keep the solution inside the existing desktop replay service instead of adding more persistence state elsewhere

## Verification

- Passed `node_modules/.bin/tsc --noEmit -p apps/desktop/tsconfig.json`
- Passed `node_modules/.bin/biome check apps/desktop/src/main/runtime-service.ts packages/protocol/src/runtime.ts`
- `bun run typecheck`, `bun run lint`, and `bun run format` still cannot run here because `bun` is not installed

## Next Potential Vector

- Add a focused runtime-level regression test or harness around replay hydration plus checkpoint persistence so future replay work is verified by behavior, not just typecheck and lint
