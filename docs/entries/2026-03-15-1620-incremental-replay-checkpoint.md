# Log Entry

- Time: 2026-03-15 16:20 CET
- Status assessment: live-output replay was durable at terminal/blocked transitions but lost during crashes or force-quits of active runs

## What Was Improved

- Added `REPLAY_CHECKPOINT_INTERVAL = 50` constant to `@iamrobot/protocol` alongside `MAX_LIVE_OUTPUT_CHUNKS`
- Added `replayCheckpointCursor` map to `DefaultDesktopRuntimeService` to track the in-memory output chunk count at the time of the last incremental persist
- Added an incremental checkpoint trigger inside `ensureRunWatcher`: every 50 new output chunks during an active run, `persistRunOutputReplay` is called without waiting for a status transition
- Updated `persistRunOutputReplay` to refresh the cursor after a successful save so the next interval is measured from the actual saved state
- Cleaned up the cursor entry in `stopWatchingRun` to prevent stale map entries after terminal runs

## Why It Was Improved

- The previous implementation only persisted the replay artifact when runs reached `blocked`, `failed`, or `succeeded`
- If the Electron process crashed or was force-quit during an active run, the entire in-memory output buffer was lost with no recovery path
- Incremental checkpointing ensures that at most 50 output chunks are lost in a crash scenario, giving autonomous and long-running sessions a meaningful recovery baseline

## Strategic Direction Chosen

- Extend the existing chunk-count and cursor tracking pattern already present in `appendRunEventHistory` rather than introducing a timer or a separate worker
- Keep the interval event-driven so persistence pressure scales naturally with output rate and stays silent during idle runs

## Verification

- Passed `apps/desktop/node_modules/.bin/tsc --noEmit -p apps/desktop/tsconfig.json`
- Passed `node_modules/.bin/biome check apps/desktop/src/main/runtime-service.ts packages/protocol/src/runtime.ts`

## Next Potential Vector

- Expose the last-checkpointed chunk count through the debug or heartbeat surface so operators can observe replay durability health during long autonomous sessions
