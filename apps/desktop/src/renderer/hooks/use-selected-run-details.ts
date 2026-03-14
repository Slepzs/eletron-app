import type { RunId, RuntimeRunDetails, RuntimeSnapshot } from "@iamrobot/protocol";
import { startTransition, useEffect, useState } from "react";

interface SelectedRunDetailsState {
  readonly details: RuntimeRunDetails | null;
  readonly error: string | null;
  readonly loading: boolean;
}

export function useSelectedRunDetails(selectedRunId: RunId | null, snapshot: RuntimeSnapshot) {
  const [state, setState] = useState<SelectedRunDetailsState>({
    details: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!selectedRunId) {
      setState({
        details: null,
        loading: false,
        error: null,
      });
      return;
    }

    const runId = selectedRunId;
    let cancelled = false;

    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    async function loadDetails() {
      try {
        const details = await window.iamRobot.getRunDetails(runId);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setState({
            details,
            loading: false,
            error: details ? null : `Unknown run: ${runId}`,
          });
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          details: null,
          loading: false,
          error: error instanceof Error ? error.message : "Unable to load run details.",
        });
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedRunId, snapshot]);

  return state;
}
