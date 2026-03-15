# Log Entry

- Time: 2026-03-15 17:21 CET
- Status assessment: incremental replay checkpointing was in place but the checkpoint cursor state was entirely internal to `DefaultDesktopRuntimeService` with no observable surface for operators

## What Was Improved

- Added `ReplayDiagnostics` interface to `apps/desktop/src/shared/desktop-api.ts` — `{ activeRunCheckpoints: Readonly<Record<RunId, number>> }` maps each actively-watched run to its last-checkpointed output chunk count
- Added `getReplayDiagnostics` to `desktopIpcChannels` (`"desktop-runtime:get-replay-diagnostics"`)
- Added `getReplayDiagnostics(): Promise<ReplayDiagnostics>` to the `DesktopApi` interface and the `DesktopRuntimeService` interface
- Implemented `getReplayDiagnostics()` in `DefaultDesktopRuntimeService` — iterates `replayCheckpointCursor` and projects it into a plain object
- Registered the IPC handler in `register-desktop-api.ts`
- Wired up the preload binding in `apps/desktop/src/preload/api.ts`

## Why It Was Improved

- The incremental checkpoint cursor was opaque — there was no way for operators or tooling to verify that replay durability was functioning during a long autonomous session
- Exposing `getReplayDiagnostics()` through the full IPC chain gives any renderer-side code (dev tools, future debug panel, health checks) a synchronous query path to read the current checkpoint state
- This closes the observability gap identified in the previous session's "Next Potential Vector"

## Strategic Direction Chosen

- Minimal IPC surface addition following the existing `getHeartbeatMode` / `setHeartbeatMode` pattern — no schema changes to `RuntimeSnapshot` or `RuntimeRunDetails`, no new subscriptions, no polling
- The diagnostic is a point-in-time snapshot of the cursor map, making it cheap and predictable

## Verification

- Passed `apps/desktop/node_modules/.bin/tsc --noEmit -p apps/desktop/tsconfig.json`
- Passed `node_modules/.bin/biome check` on all four modified files

## Next Potential Vector

- Build a lightweight debug panel in the renderer (or hook into the existing heartbeat display) that calls `getReplayDiagnostics()` on an interval and shows per-run checkpoint health alongside run status
- Alternatively: include the checkpoint count as metadata in the next `RuntimeSnapshot` push so it reaches the renderer passively without a separate poll
