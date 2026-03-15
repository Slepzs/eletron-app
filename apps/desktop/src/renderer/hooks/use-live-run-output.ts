import type { AgentOutputChunk, RunId } from "@iamrobot/protocol";
import { startTransition, useEffect, useState } from "react";

interface LiveRunOutputState {
  readonly entries: readonly AgentOutputChunk[];
  readonly error: string | null;
}

const MAX_OUTPUT_ENTRIES = 600;

function isOutputChunk(event: { readonly type: string }): event is AgentOutputChunk {
  return event.type === "stdout" || event.type === "stderr";
}

export function useLiveRunOutput(selectedRunId: RunId | null) {
  const [state, setState] = useState<LiveRunOutputState>({
    entries: [],
    error: null,
  });

  useEffect(() => {
    if (!selectedRunId) {
      setState({
        entries: [],
        error: null,
      });
      return;
    }

    let cancelled = false;
    let dispose: (() => void) | undefined;
    const runId = selectedRunId;

    setState({
      entries: [],
      error: null,
    });

    async function subscribe() {
      try {
        dispose = await window.iamRobot.subscribeToRun(runId, (event) => {
          if (cancelled || !isOutputChunk(event)) {
            return;
          }

          startTransition(() => {
            setState((current) => ({
              entries: trimOutputEntries([...current.entries, event]),
              error: null,
            }));
          });
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          entries: [],
          error: error instanceof Error ? error.message : "Unable to subscribe to live output.",
        });
      }
    }

    void subscribe();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [selectedRunId]);

  return state;
}

function trimOutputEntries(entries: readonly AgentOutputChunk[]): readonly AgentOutputChunk[] {
  if (entries.length <= MAX_OUTPUT_ENTRIES) {
    return entries;
  }

  return entries.slice(entries.length - MAX_OUTPUT_ENTRIES);
}
