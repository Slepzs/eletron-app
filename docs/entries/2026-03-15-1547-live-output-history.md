# Log Entry

- Time: 2026-03-15 15:47 CET
- Status assessment: the live-output feature was complete enough to use, but suboptimal under long-running autonomous sessions

## What Was Improved

- Moved the live-output retention limit into the shared runtime contract with `MAX_LIVE_OUTPUT_CHUNKS`
- Capped in-memory orchestrator output chunk history so active runs do not grow without bound
- Capped desktop run replay history while preserving all domain events and the most recent live output
- Stopped desktop run watchers after terminal run statuses so completed runs do not keep long-lived subscriptions

## Why It Was Improved

- Autonomous runs can stream large amounts of stdout and stderr
- The previous implementation retained output chunks indefinitely in both the orchestrator and the desktop runtime service
- Long unattended sessions would steadily increase memory pressure and leave stale watchers around after terminal runs

## Strategic Direction Chosen

- Strengthen the current autonomous observability path before expanding capability further
- Keep live-output streaming responsive and bounded so heartbeat mode remains reliable under sustained usage

## Verification

- Passed manual package-by-package `tsc --noEmit` across the workspace
- Passed manual package-by-package `biome check` across the workspace
- `bun run typecheck`, `bun run lint`, and `bun run format` could not be executed in this environment because `bun` is not installed

## Next Potential Vector

- Persist or index selected live-output history through artifacts or storage-backed replay so useful terminal context survives process restarts without unbounded in-memory retention
