import type { RunId, RuntimeSnapshot } from "@iamrobot/protocol";
import { startTransition, useEffect, useState } from "react";

interface RuntimeSnapshotState {
  readonly error: string | null;
  readonly selectedRunId: RunId | null;
  readonly snapshot: RuntimeSnapshot;
}

const emptySnapshot: RuntimeSnapshot = {
  runs: [],
  activeRunId: null,
};

function resolveSelectedRunId(
  snapshot: RuntimeSnapshot,
  selectedRunId: RunId | null,
): RunId | null {
  if (selectedRunId && snapshot.runs.some((summary) => summary.run.runId === selectedRunId)) {
    return selectedRunId;
  }

  return snapshot.activeRunId ?? snapshot.runs[0]?.run.runId ?? null;
}

export function useRuntimeSnapshot() {
  const [state, setState] = useState<RuntimeSnapshotState>({
    snapshot: emptySnapshot,
    selectedRunId: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;

    async function loadSnapshot() {
      try {
        const initialSnapshot = await window.iamRobot.listRuns();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setState((current) => ({
            snapshot: initialSnapshot,
            selectedRunId: resolveSelectedRunId(initialSnapshot, current.selectedRunId),
            error: null,
          }));
        });

        dispose = await window.iamRobot.subscribeToSnapshot((nextSnapshot) => {
          if (cancelled) {
            return;
          }

          startTransition(() => {
            setState((current) => ({
              snapshot: nextSnapshot,
              selectedRunId: resolveSelectedRunId(nextSnapshot, current.selectedRunId),
              error: null,
            }));
          });
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          error:
            error instanceof Error ? error.message : "Unable to load desktop runtime snapshot.",
        }));
      }
    }

    void loadSnapshot();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  function selectRun(runId: RunId) {
    setState((current) => ({
      ...current,
      selectedRunId: runId,
    }));
  }

  return {
    error: state.error,
    selectedRunId: state.selectedRunId,
    selectRun,
    snapshot: state.snapshot,
  };
}
